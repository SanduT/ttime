import {
  compareTimestamps,
  type Entry,
  type LocalDate,
  localDateOf,
  secondsBetween,
} from '@ttime/core';

/** The periods the project detail shows. */
export type Period = 'week' | 'month' | 'all';

/** One day of a project's entries. */
export type ProjectDay = {
  readonly date: LocalDate;
  readonly entries: readonly Entry[];
  readonly seconds: number;
};

/** The first day of `period` containing `today`, or null for all time. */
export const periodStart = (
  period: Period,
  today: LocalDate,
  weekStart: LocalDate,
): LocalDate | null => {
  if (period === 'all') {
    return null;
  }
  return period === 'week' ? weekStart : `${today.slice(0, 8)}01`;
};

/**
 * A project's entries from `from` (all when null), grouped by the day they start, newest day
 * first and entries by start within a day. Pure.
 */
export const projectDays = (
  entries: readonly Entry[],
  project: string,
  from: LocalDate | null,
): ProjectDay[] => {
  const days = new Map<LocalDate, Entry[]>();
  for (const entry of entries) {
    const date = localDateOf(entry.start);
    if (entry.project === project && (from === null || date >= from)) {
      days.set(date, [...(days.get(date) ?? []), entry]);
    }
  }
  return [...days]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, list]) => ({
      date,
      entries: [...list].sort((a, b) => compareTimestamps(a.start, b.start)),
      seconds: list.reduce((sum, e) => sum + secondsBetween(e.start, e.end), 0),
    }));
};
