import { compareTimestamps, type LocalDate } from '../lib/time';
import type { Entry } from '../schema/entry';

/** Which entries to list. Dates are day-file dates (the local date of each entry's start). */
export type EntryFilter = {
  readonly from: LocalDate;
  readonly to: LocalDate;
  readonly project?: string;
  readonly tag?: string;
  /** Case-insensitive text in the description or a note. */
  readonly query?: string;
};

const matchesText = (entry: Entry, query: string): boolean => {
  const needle = query.toLowerCase();
  return (
    entry.description.toLowerCase().includes(needle) ||
    entry.notes.some((note) => note.text.toLowerCase().includes(needle))
  );
};

/** Finished entries from `days` that match `filter`, by start then ID. Pure. */
export const queryEntries = (
  days: ReadonlyMap<LocalDate, { readonly entries: readonly Entry[] }>,
  filter: EntryFilter,
): Entry[] =>
  [...days]
    .filter(([date]) => date >= filter.from && date <= filter.to)
    .flatMap(([, day]) => day.entries)
    .filter(
      (entry) =>
        (filter.project === undefined || entry.project === filter.project) &&
        (filter.tag === undefined || entry.tags.includes(filter.tag)) &&
        (filter.query === undefined || matchesText(entry, filter.query)),
    )
    .sort((a, b) => compareTimestamps(a.start, b.start) || a.id.localeCompare(b.id));
