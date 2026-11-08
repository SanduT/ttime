import { TTimeError } from '../lib/errors';
import {
  compareTimestamps,
  formatTimestamp,
  formatWallTime,
  localDateOf,
  secondsBetween,
  type Timestamp,
  toZoned,
} from '../lib/time';
import type { Entry } from '../schema/entry';

const offsetZone = (timestamp: Timestamp): string => timestamp.slice(19);

/** The entry moved to `start`, keeping its duration. `end` is written in `start`'s offset. */
export const shiftEntry = (entry: Entry, start: Timestamp): Entry => {
  const seconds = secondsBetween(entry.start, entry.end);
  const end = formatTimestamp(toZoned(start, offsetZone(start)).add({ seconds }));
  return { ...entry, start, end };
};

/**
 * Splits an entry at `at`, which must be strictly inside it. The first part keeps the ID; the
 * second gets `newId`. Notes go to the part their time falls in. Pure.
 */
export const splitEntry = (
  entry: Entry,
  at: Timestamp,
  newId: string,
  updatedAt: Timestamp,
): readonly [Entry, Entry] => {
  if (compareTimestamps(at, entry.start) <= 0 || compareTimestamps(at, entry.end) >= 0) {
    const day = localDateOf(entry.start);
    const w = (time: Timestamp): string => formatWallTime(time, day);
    const message = `${w(at)} is not inside the entry (${w(entry.start)} to ${w(entry.end)}).`;
    throw new TTimeError('entry.invalid_range', message, {
      details: { id: entry.id, start: entry.start, end: entry.end, at },
    });
  }
  const before = entry.notes.filter((note) => compareTimestamps(note.at, at) < 0);
  const after = entry.notes.filter((note) => compareTimestamps(note.at, at) >= 0);
  return [
    { ...entry, end: at, notes: before, updatedAt },
    { ...entry, id: newId, start: at, notes: after, updatedAt },
  ];
};

/**
 * Merges entries of one project into the earliest one: from the earliest start to the latest
 * end, tags and notes combined. Gaps between them become tracked time. Pure.
 */
export const mergeEntries = (
  entries: readonly Entry[],
  updatedAt: Timestamp,
): { readonly merged: Entry; readonly removed: readonly Entry[] } => {
  const sorted = [...entries].sort((a, b) => compareTimestamps(a.start, b.start));
  const [first, ...rest] = sorted;
  if (first === undefined || rest.length === 0) {
    throw new TTimeError('input.invalid', 'Merging needs at least two entries');
  }
  if (rest.some((e) => e.project !== first.project)) {
    throw new TTimeError('input.invalid', 'Only entries of the same project can be merged', {
      details: { ids: sorted.map((e) => e.id) },
    });
  }
  const end = sorted.map((e) => e.end).reduce((a, b) => (compareTimestamps(a, b) >= 0 ? a : b));
  const merged: Entry = {
    ...first,
    end,
    tags: [...new Set(sorted.flatMap((e) => e.tags))],
    notes: sorted.flatMap((e) => e.notes),
    updatedAt,
  };
  return { merged, removed: rest };
};
