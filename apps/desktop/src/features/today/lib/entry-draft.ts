import {
  addDays,
  compareTimestamps,
  type Entry,
  type LocalDate,
  type Timestamp,
  timestampOn,
} from '@ttime/core';

import { clockOf } from '../../../shared/lib/display';

/** What the entry form edits, as typed. */
export type EntryDraft = {
  readonly description: string;
  readonly project: string;
  readonly start: string;
  readonly end: string;
};

/** The form values of an existing entry. */
export const draftOf = (entry: Entry): EntryDraft => ({
  description: entry.description,
  project: entry.project,
  start: clockOf(entry.start),
  end: clockOf(entry.end),
});

/** The range a draft means on `date`, or a message for the form. */
export type DraftRange =
  | { readonly ok: true; readonly start: Timestamp; readonly end: Timestamp }
  | { readonly ok: false; readonly message: string };

/**
 * Reads the typed start and end on `date`. An end at or before the start is on the next day,
 * so `22:00` to `01:00` is three hours.
 */
export const rangeOf = (draft: EntryDraft, date: LocalDate, timeZone: string): DraftRange => {
  const start = timestampOn(date, draft.start, timeZone);
  if (start === null) {
    return { ok: false, message: `"${draft.start}" is not a start time like 09:30.` };
  }
  const sameDay = timestampOn(date, draft.end, timeZone);
  if (sameDay === null) {
    return { ok: false, message: `"${draft.end}" is not an end time like 17:00.` };
  }
  const end =
    compareTimestamps(sameDay, start) > 0
      ? sameDay
      : (timestampOn(addDays(date, 1), draft.end, timeZone) ?? sameDay);
  return { ok: true, start, end };
};
