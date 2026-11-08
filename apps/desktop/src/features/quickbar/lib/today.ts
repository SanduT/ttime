import {
  compareTimestamps,
  type DayFile,
  type LocalDate,
  localDateOf,
  type RunningEntry,
  secondsBetween,
  type Timestamp,
} from '@ttime/core';

/** One row of the quick bar's Today list. `end` is null for the running entry. */
type TodayRow = {
  readonly id: string;
  readonly project: string;
  readonly description: string;
  readonly start: Timestamp;
  readonly end: Timestamp | null;
  readonly seconds: number;
};

/** Today's entries in start order, with the running one last, and their total. */
type TodayList = { readonly rows: readonly TodayRow[]; readonly totalSeconds: number };

/**
 * Entries from today's day file plus the running entry (when it started today), timed up to
 * `now`. Pure.
 */
export const buildToday = (
  days: ReadonlyMap<LocalDate, Pick<DayFile, 'entries'>>,
  running: RunningEntry | null,
  today: LocalDate,
  now: Timestamp,
): TodayList => {
  const finished: TodayRow[] = (days.get(today)?.entries ?? []).map((entry) => ({
    id: entry.id,
    project: entry.project,
    description: entry.description,
    start: entry.start,
    end: entry.end,
    seconds: secondsBetween(entry.start, entry.end),
  }));
  const current: TodayRow[] =
    running !== null && localDateOf(running.start) === today
      ? [
          {
            id: running.id,
            project: running.project,
            description: running.description,
            start: running.start,
            end: null,
            seconds: Math.max(0, secondsBetween(running.start, now)),
          },
        ]
      : [];
  const rows = [...finished, ...current].sort((a, b) => compareTimestamps(a.start, b.start));
  return { rows, totalSeconds: rows.reduce((sum, row) => sum + row.seconds, 0) };
};
