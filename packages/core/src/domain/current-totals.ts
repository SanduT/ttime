import { Temporal } from 'temporal-polyfill';

import { formatTimestamp, type LocalDate } from '../lib/time';
import type { Entry, RunningEntry } from '../schema/entry';
import type { VaultSettings } from '../schema/vault-config';
import { splitByDay } from './split-by-day';

/** Seconds on one project. */
export type ProjectTotal = { readonly project: string; readonly seconds: number };

/** Total seconds and per-project seconds, most first. */
type Total = { readonly seconds: number; readonly byProject: readonly ProjectTotal[] };

/** Today's and this week's totals, as the menu bar and `ttime status` show them. */
export type CurrentTotals = {
  readonly today: Total & { readonly date: LocalDate };
  readonly week: Total & { readonly start: LocalDate };
};

/** Inputs of {@link currentTotals}. */
export type CurrentTotalsInput = {
  readonly entries: readonly Entry[];
  readonly running: RunningEntry | null;
  readonly now: Temporal.ZonedDateTime;
  readonly settings: Pick<VaultSettings, 'weekStartsOn' | 'dayStartsAt'>;
};

const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

/** The report day `now` falls in: its date, minus one before `dayStartsAt`. */
const reportDay = (now: Temporal.ZonedDateTime, dayStartsAt: string): Temporal.PlainDate =>
  Temporal.PlainTime.compare(now.toPlainTime(), Temporal.PlainTime.from(dayStartsAt)) < 0
    ? now.toPlainDate().subtract({ days: 1 })
    : now.toPlainDate();

const toTotal = (byProject: ReadonlyMap<string, number>): Total => ({
  seconds: [...byProject.values()].reduce((sum, seconds) => sum + seconds, 0),
  byProject: [...byProject]
    .map(([project, seconds]) => ({ project, seconds }))
    .sort((a, b) => b.seconds - a.seconds || a.project.localeCompare(b.project)),
});

/**
 * Today's and this week's tracked time, split at report-day boundaries (`dayStartsAt`, local
 * time zone of `now`), with the running entry counted up to `now`. Pure.
 */
export const currentTotals = (input: CurrentTotalsInput): CurrentTotals => {
  const { now, settings } = input;
  const today = reportDay(now, settings.dayStartsAt);
  const weekStart = today.subtract({
    days: (today.dayOfWeek - 1 - WEEKDAYS.indexOf(settings.weekStartsOn) + 7) % 7,
  });
  const nowStamp = formatTimestamp(now);
  const spans = [
    ...input.entries,
    ...(input.running === null ? [] : [{ ...input.running, end: nowStamp }]),
  ];
  const todayTotals = new Map<string, number>();
  const weekTotals = new Map<string, number>();
  const options = { timeZone: now.timeZoneId, dayStartsAt: settings.dayStartsAt };
  for (const span of spans) {
    for (const segment of splitByDay(span.start, span.end, options)) {
      const date = Temporal.PlainDate.from(segment.date);
      if (Temporal.PlainDate.compare(date, weekStart) < 0) {
        continue;
      }
      if (Temporal.PlainDate.compare(date, today) > 0) {
        continue;
      }
      weekTotals.set(span.project, (weekTotals.get(span.project) ?? 0) + segment.seconds);
      if (Temporal.PlainDate.compare(date, today) === 0) {
        todayTotals.set(span.project, (todayTotals.get(span.project) ?? 0) + segment.seconds);
      }
    }
  }
  return {
    today: { date: today.toString(), ...toTotal(todayTotals) },
    week: { start: weekStart.toString(), ...toTotal(weekTotals) },
  };
};
