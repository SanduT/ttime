import { SCHEMA_VERSION } from '../lib/constants';
import { TTimeError } from '../lib/errors';
import { addDays, compareTimestamps, localDateOf, type Timestamp } from '../lib/time';
import type { Entry, RunningEntry } from '../schema/entry';
import type { VaultTx } from '../storage/transaction';
import { entriesBetween, nowStamp, putEntry } from './entry-store';

/** What to do when a backdated start overlaps finished entries. */
export type OnConflict = 'cancel' | 'trim';

/** The running entry after crash recovery. */
export type ActiveRunning = {
  readonly running: RunningEntry | null;
  /** Set when `running.json` named an entry already in its day file: a stop that died midway. */
  readonly completed: Entry | null;
};

/**
 * Reads `running.json`. If its entry is already in its day file, the stop completed before a
 * crash: `running.json` is cleared in this transaction and nothing counts as running.
 */
export const readActiveRunning = async (tx: VaultTx): Promise<ActiveRunning> => {
  const { entry } = await tx.readRunning();
  if (entry === null) {
    return { running: null, completed: null };
  }
  const day = await tx.readDay(localDateOf(entry.start));
  const completed = day.entries.find((e) => e.id === entry.id);
  if (completed === undefined) {
    return { running: entry, completed: null };
  }
  tx.writeRunning({ schema: SCHEMA_VERSION, entry: null });
  return { running: null, completed };
};

/** The running entry, or `timer.not_running`. */
export const requireRunning = async (tx: VaultTx): Promise<RunningEntry> => {
  const { running } = await readActiveRunning(tx);
  if (running === null) {
    throw new TTimeError('timer.not_running', 'Nothing is running');
  }
  return running;
};

/**
 * Ends the running entry at `end` and writes it to its day file (the caller then clears or
 * replaces `running.json`, so the day file is always written first). A zero-length entry is
 * discarded and returns null; the changelog still records it.
 */
export const finishRunning = async (
  tx: VaultTx,
  running: RunningEntry,
  end: Timestamp,
): Promise<Entry | null> => {
  const order = compareTimestamps(end, running.start);
  if (order < 0) {
    throw new TTimeError('timer.invalid_end', `End ${end} is before the start ${running.start}`, {
      details: { start: running.start, end },
    });
  }
  if (order === 0) {
    tx.record({ op: 'stop', kind: 'entry', id: running.id, before: running, after: null });
    return null;
  }
  const entry: Entry = { ...running, end, updatedAt: nowStamp(tx) };
  await putEntry(tx, entry);
  tx.record({ op: 'stop', kind: 'entry', id: running.id, before: running, after: entry });
  return entry;
};

/**
 * Makes room for time running from `start` until now. Finished entries ending after `start`
 * conflict. With `cancel`, any conflict throws `timer.backdate_overlap`. With `trim`, entries
 * that started before `start` end at `start`; an entry that would become empty (it starts at or
 * after `start`) still throws. Looks at day files from the day before `start` until today.
 */
export const clearBackdate = async (
  tx: VaultTx,
  start: Timestamp,
  onConflict: OnConflict,
): Promise<void> => {
  const from = addDays(localDateOf(start), -1);
  const entries = await entriesBetween(tx, from, localDateOf(nowStamp(tx)));
  const conflicts = entries.filter((e) => compareTimestamps(e.end, start) > 0);
  if (conflicts.length === 0) {
    return;
  }
  const trimmable = conflicts.every((e) => compareTimestamps(e.start, start) < 0);
  if (onConflict === 'cancel' || !trimmable) {
    throw new TTimeError('timer.backdate_overlap', `Start ${start} overlaps earlier entries`, {
      details: {
        start,
        trimmable,
        conflicts: conflicts.map((e) => ({ id: e.id, start: e.start, end: e.end })),
      },
    });
  }
  for (const entry of conflicts) {
    const trimmed: Entry = { ...entry, end: start, updatedAt: nowStamp(tx) };
    await putEntry(tx, trimmed);
    tx.record({ op: 'update', kind: 'entry', id: entry.id, before: entry, after: trimmed });
  }
};
