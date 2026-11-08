import { Temporal } from 'temporal-polyfill';

import { MAX_FUTURE_START_SECONDS, SCHEMA_VERSION } from '../lib/constants';
import { type ErrorCode, TTimeError } from '../lib/errors';
import {
  addDays,
  compareDates,
  compareTimestamps,
  formatTimestamp,
  formatWallTime,
  isTimestamp,
  type LocalDate,
  localDateOf,
  secondsBetween,
  type Timestamp,
} from '../lib/time';
import { ULID_PATTERN, ulidTime } from '../lib/ulid';
import type { Entry } from '../schema/entry';
import type { Project } from '../schema/project';
import type { VaultTx } from '../storage/transaction';

/** The transaction's instant as a vault timestamp. */
export const nowStamp = (tx: VaultTx): Timestamp => formatTimestamp(tx.now);

/** Collapses runs of whitespace and trims. */
export const normalizeText = (text: string): string => text.trim().replace(/\s+/g, ' ');

/** Trimmed, non-empty, unique tags in input order. */
export const normalizeTags = (tags: readonly string[]): string[] => [
  ...new Set(tags.map((tag) => tag.trim()).filter((tag) => tag !== '')),
];

/** Throws `input.invalid` unless `value` is a vault timestamp. */
export const requireTimestamp = (value: Timestamp, field: string): void => {
  if (!isTimestamp(value)) {
    throw new TTimeError('input.invalid', `Invalid ${field}: ${value}`, {
      details: { field, value },
    });
  }
};

/** A timestamp for an error message, relative to the transaction's today. */
export const wallTime = (tx: VaultTx, time: Timestamp): string =>
  formatWallTime(time, localDateOf(nowStamp(tx)));

/** Throws `code` when `time` is more than the allowed clock skew in the future. */
export const requireNotFuture = (tx: VaultTx, time: Timestamp, code: ErrorCode): void => {
  if (secondsBetween(nowStamp(tx), time) > MAX_FUTURE_START_SECONDS) {
    throw new TTimeError(code, `${wallTime(tx, time)} is in the future.`, {
      details: { time, now: nowStamp(tx) },
    });
  }
};

/** Reads a project, throwing `project.not_found` or (for new time) `project.archived`. */
export const requireProject = async (
  tx: VaultTx,
  id: string,
  options: { readonly allowArchived?: boolean } = {},
): Promise<Project> => {
  const project = await tx.readProject(id);
  if (project === null) {
    throw new TTimeError('project.not_found', `No project "${id}"`, { details: { project: id } });
  }
  if (project.status === 'archived' && options.allowArchived !== true) {
    throw new TTimeError('project.archived', `Project "${id}" is archived`, {
      details: { project: id },
    });
  }
  return project;
};

/** Writes `entry` into the day file of its start date, replacing a previous version. */
export const putEntry = async (tx: VaultTx, entry: Entry): Promise<void> => {
  const day = await tx.readDay(localDateOf(entry.start));
  tx.writeDay({ ...day, entries: [...day.entries.filter((e) => e.id !== entry.id), entry] });
};

/** Removes `entry` from the day file `date`. The file stays, possibly with no entries. */
export const dropEntry = async (tx: VaultTx, id: string, date: LocalDate): Promise<void> => {
  const day = await tx.readDay(date);
  tx.writeDay({ ...day, entries: day.entries.filter((e) => e.id !== id) });
};

/** An entry and the day file it lives in. */
export type LocatedEntry = { readonly entry: Entry; readonly date: LocalDate };

/** Day files to search for `id`, likeliest first: around its creation date, then newest first. */
const searchOrder = (tx: VaultTx, id: string, days: readonly LocalDate[]): LocalDate[] => {
  const created = Temporal.Instant.fromEpochMilliseconds(ulidTime(id))
    .toZonedDateTimeISO(tx.now.timeZoneId)
    .toPlainDate()
    .toString();
  const likely = [created, addDays(created, -1), addDays(created, 1)];
  const rest = days.filter((d) => !likely.includes(d)).sort((a, b) => compareDates(b, a));
  return [...likely.filter((d) => days.includes(d)), ...rest];
};

/** Finds an entry by ID in the day files. Throws `entry.not_found`. */
export const findEntry = async (tx: VaultTx, id: string): Promise<LocatedEntry> => {
  if (ULID_PATTERN.test(id)) {
    for (const date of searchOrder(tx, id, await tx.listDays())) {
      const entry = (await tx.readDay(date)).entries.find((e) => e.id === id);
      if (entry !== undefined) {
        return { entry, date };
      }
    }
  }
  throw new TTimeError('entry.not_found', `No entry "${id}"`, { details: { id } });
};

/** All entries in existing day files from `from` to `to`, inclusive. */
export const entriesBetween = async (
  tx: VaultTx,
  from: LocalDate,
  to: LocalDate,
): Promise<Entry[]> => {
  const dates = (await tx.listDays()).filter(
    (d) => compareDates(d, from) >= 0 && compareDates(d, to) <= 0,
  );
  const days = await Promise.all(dates.map((date) => tx.readDay(date)));
  return days.flatMap((day) => day.entries);
};

/** The entry that ended last, looking at the newest non-empty day file. */
export const lastEntry = async (tx: VaultTx): Promise<Entry | null> => {
  const dates = [...(await tx.listDays())].sort((a, b) => compareDates(b, a));
  for (const date of dates) {
    const { entries } = await tx.readDay(date);
    const [latest] = [...entries].sort((a, b) => compareTimestamps(b.end, a.end));
    if (latest !== undefined) {
      return latest;
    }
  }
  return null;
};

/** Moves an entry to `.trash/entries/<id>.json`. The caller removes it from its day file. */
export const trashEntry = async (tx: VaultTx, entry: Entry): Promise<void> => {
  await tx.readTrash(entry.id);
  tx.writeTrash({ schema: SCHEMA_VERSION, deletedAt: nowStamp(tx), deletedBy: tx.actor, entry });
};
