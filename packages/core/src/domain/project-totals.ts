import { Temporal } from 'temporal-polyfill';

import { formatTimestamp } from '../lib/time';
import type { Entry, RunningEntry } from '../schema/entry';
import type { VaultSettings } from '../schema/vault-config';
import { reportDay, weekStartOf } from './current-totals';
import { splitByDay } from './split-by-day';

/** Hours of one project in the Projects list. */
export type ProjectHours = {
  readonly week: number;
  readonly month: number;
  readonly all: number;
};

/** Inputs of {@link projectTotals}. */
export type ProjectTotalsInput = {
  /** Every entry (all time). */
  readonly entries: readonly Entry[];
  readonly running: RunningEntry | null;
  readonly now: Temporal.ZonedDateTime;
  readonly settings: Pick<VaultSettings, 'weekStartsOn' | 'dayStartsAt'>;
};

const EMPTY: ProjectHours = { week: 0, month: 0, all: 0 };

/**
 * Seconds per project this week, this month and all time, split at report-day boundaries, with
 * the running entry counted up to now. Projects without time are absent. Pure.
 */
export const projectTotals = (input: ProjectTotalsInput): ReadonlyMap<string, ProjectHours> => {
  const { now, settings } = input;
  const today = reportDay(now, settings.dayStartsAt);
  const weekStart = weekStartOf(today, settings.weekStartsOn);
  const monthStart = today.with({ day: 1 });
  const options = { timeZone: now.timeZoneId, dayStartsAt: settings.dayStartsAt };
  const spans = [
    ...input.entries,
    ...(input.running === null ? [] : [{ ...input.running, end: formatTimestamp(now) }]),
  ];
  const totals = new Map<string, ProjectHours>();
  for (const span of spans) {
    for (const segment of splitByDay(span.start, span.end, options)) {
      const date = Temporal.PlainDate.from(segment.date);
      const inRange = (from: Temporal.PlainDate) =>
        Temporal.PlainDate.compare(date, from) >= 0 && Temporal.PlainDate.compare(date, today) <= 0;
      const current = totals.get(span.project) ?? EMPTY;
      totals.set(span.project, {
        week: current.week + (inRange(weekStart) ? segment.seconds : 0),
        month: current.month + (inRange(monthStart) ? segment.seconds : 0),
        all: current.all + segment.seconds,
      });
    }
  }
  return totals;
};
