import { Temporal } from 'temporal-polyfill';

import {
  compareTimestamps,
  formatTimestamp,
  type LocalDate,
  secondsBetween,
  type Timestamp,
  toZoned,
} from '../lib/time';
import type { Entry, RunningEntry } from '../schema/entry';
import type { VaultSettings } from '../schema/vault-config';
import type { ProjectTotal } from './current-totals';
import { splitByDay } from './split-by-day';

/** Gaps shorter than this are not offered for filling. */
export const MIN_GAP_SECONDS = 5 * 60;

/** An untracked stretch inside working hours, offered as "Fill gap". */
export type Gap = { readonly start: Timestamp; readonly end: Timestamp; readonly seconds: number };

/** One row of the Today list. */
export type DayRow =
  | { readonly kind: 'entry'; readonly entry: Entry }
  | { readonly kind: 'running'; readonly entry: RunningEntry }
  | { readonly kind: 'gap'; readonly gap: Gap };

type TimedRow = Exclude<DayRow, { readonly kind: 'gap' }>;

const rowStart = (row: DayRow): Timestamp => (row.kind === 'gap' ? row.gap.start : row.entry.start);

/** The Today view of one day. */
export type DayView = {
  readonly date: LocalDate;
  /** Entries and the running entry by start, with gaps between them. */
  readonly rows: readonly DayRow[];
  readonly totalSeconds: number;
  readonly byProject: readonly ProjectTotal[];
};

/** Inputs of {@link dayView}. */
export type DayViewInput = {
  readonly date: LocalDate;
  /** Entries of the day file `date` (and neighbours, for totals across midnight). */
  readonly entries: readonly Entry[];
  readonly running: RunningEntry | null;
  readonly now: Temporal.ZonedDateTime;
  readonly settings: { readonly workingHours: WorkingHours; readonly dayStartsAt: string };
};

/** Working days and hours, as in `ttime.json` `settings.workingHours`. */
type WorkingHours = {
  readonly days: readonly VaultSettings['workingHours']['days'][number][];
  readonly start: string;
  readonly end: string;
};

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/** Working hours of `date` in `timeZone`, or null on a day off. */
const workingSpan = (
  date: LocalDate,
  timeZone: string,
  hours: WorkingHours,
): { readonly start: Timestamp; readonly end: Timestamp } | null => {
  const day = Temporal.PlainDate.from(date);
  if (!hours.days.includes(WEEKDAYS[day.dayOfWeek - 1] ?? 'mon')) {
    return null;
  }
  const at = (time: string) =>
    formatTimestamp(day.toZonedDateTime({ timeZone, plainTime: Temporal.PlainTime.from(time) }));
  return { start: at(hours.start), end: at(hours.end) };
};

const later = (a: Timestamp, b: Timestamp): Timestamp => (compareTimestamps(a, b) > 0 ? a : b);
const earlier = (a: Timestamp, b: Timestamp): Timestamp => (compareTimestamps(a, b) < 0 ? a : b);

/** Untracked stretches of working hours up to `now`, between the busy spans (sorted by start). */
const findGaps = (
  busy: readonly { readonly start: Timestamp; readonly end: Timestamp }[],
  work: { readonly start: Timestamp; readonly end: Timestamp },
  now: Timestamp,
): Gap[] => {
  const gaps: Gap[] = [];
  const limit = earlier(work.end, now);
  let cursor = work.start;
  for (const span of [...busy, { start: limit, end: limit }]) {
    const end = earlier(span.start, limit);
    if (secondsBetween(cursor, end) >= MIN_GAP_SECONDS) {
      gaps.push({ start: cursor, end, seconds: secondsBetween(cursor, end) });
    }
    cursor = later(cursor, span.end);
  }
  return gaps;
};

const totalsFor = (
  input: DayViewInput,
  spans: readonly {
    readonly project: string;
    readonly start: Timestamp;
    readonly end: Timestamp;
  }[],
) => {
  const options = { timeZone: input.now.timeZoneId, dayStartsAt: input.settings.dayStartsAt };
  const totals = new Map<string, number>();
  for (const span of spans) {
    for (const segment of splitByDay(span.start, span.end, options)) {
      if (segment.date === input.date) {
        totals.set(span.project, (totals.get(span.project) ?? 0) + segment.seconds);
      }
    }
  }
  const byProject = [...totals]
    .map(([project, seconds]) => ({ project, seconds }))
    .sort((a, b) => b.seconds - a.seconds || a.project.localeCompare(b.project));
  return { totalSeconds: byProject.reduce((sum, t) => sum + t.seconds, 0), byProject };
};

/**
 * The Today list for `date`: entries starting that day and the running entry, by start, with
 * gaps of at least {@link MIN_GAP_SECONDS} inside working hours (never after now), and the
 * day's totals split at `dayStartsAt`. Pure.
 */
export const dayView = (input: DayViewInput): DayView => {
  const zone = input.now.timeZoneId;
  const now = formatTimestamp(input.now);
  const startsOnDate = (start: Timestamp) =>
    toZoned(start, zone).toPlainDate().toString() === input.date;
  const listed = input.entries.filter((e) => startsOnDate(e.start));
  const running =
    input.running !== null && startsOnDate(input.running.start) ? input.running : null;
  const items: TimedRow[] = [
    ...listed.map((entry): TimedRow => ({ kind: 'entry', entry })),
    ...(running === null ? [] : [{ kind: 'running' as const, entry: running }]),
  ].sort((a, b) => compareTimestamps(a.entry.start, b.entry.start));
  const busy = items.map((row) => ({
    start: row.entry.start,
    end: row.kind === 'entry' ? row.entry.end : now,
  }));
  const work = workingSpan(input.date, zone, input.settings.workingHours);
  const gaps = work === null ? [] : findGaps(busy, work, now);
  const rows = [...items, ...gaps.map((gap): DayRow => ({ kind: 'gap', gap }))].sort((a, b) =>
    compareTimestamps(rowStart(a), rowStart(b)),
  );
  const spans = [
    ...input.entries,
    ...(input.running === null ? [] : [{ ...input.running, end: now }]),
  ];
  return { date: input.date, rows, ...totalsFor(input, spans) };
};
