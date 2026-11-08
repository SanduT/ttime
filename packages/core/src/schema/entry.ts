import { z } from 'zod';

import { compareTimestamps, isTimestamp } from '../lib/time';
import {
  actorSchema,
  localDateSchema,
  schemaVersionSchema,
  slugSchema,
  timestampSchema,
  ulidSchema,
} from './primitives';

/** A timestamped line attached to an entry. */
const noteSchema = z.looseObject({
  at: timestampSchema,
  text: z.string(),
});

const entryFields = {
  id: ulidSchema,
  project: slugSchema,
  description: z.string(),
  start: timestampSchema,
  tags: z.array(z.string().min(1)).default([]),
  billable: z.boolean(),
  notes: z.array(noteSchema).default([]),
  createdBy: actorSchema,
  updatedAt: timestampSchema.optional(),
};

/** A finished entry. `end` must be after `start`. */
export const entrySchema = z.looseObject({ ...entryFields, end: timestampSchema }).refine(
  // Zod still runs this when a field failed, so malformed timestamps are left to their own issue.
  (entry) =>
    !isTimestamp(entry.start) ||
    !isTimestamp(entry.end) ||
    compareTimestamps(entry.end, entry.start) > 0,
  { message: 'end must be after start', path: ['end'] },
);

/** The running entry: an entry without an end. */
export const runningEntrySchema = z.looseObject(entryFields);

/** `entries/<yyyy>/<mm>/<yyyy-mm-dd>.json`. */
export const dayFileSchema = z.looseObject({
  schema: schemaVersionSchema,
  date: localDateSchema,
  entries: z.array(entrySchema),
});

/** `running.json`: the running entry, or null. */
export const runningFileSchema = z.looseObject({
  schema: schemaVersionSchema,
  entry: runningEntrySchema.nullable(),
});

/** `.trash/entries/<id>.json`: a deleted entry with who deleted it and when. */
export const trashedEntrySchema = z.looseObject({
  schema: schemaVersionSchema,
  deletedAt: timestampSchema,
  deletedBy: actorSchema,
  entry: entrySchema,
});

/** A timestamped note. */
export type Note = z.infer<typeof noteSchema>;
/** A finished entry. */
export type Entry = z.infer<typeof entrySchema>;
/** The running entry. */
export type RunningEntry = z.infer<typeof runningEntrySchema>;
/** One day file. */
export type DayFile = z.infer<typeof dayFileSchema>;
/** The running file. */
export type RunningFile = z.infer<typeof runningFileSchema>;
/** One trashed entry file. */
export type TrashedEntry = z.infer<typeof trashedEntrySchema>;
