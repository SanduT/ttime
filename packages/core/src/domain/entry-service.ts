import { TTimeError } from '../lib/errors';
import { compareTimestamps, localDateOf, type Timestamp } from '../lib/time';
import type { IdGenerator } from '../ports/id-port';
import type { Logger } from '../ports/logger';
import type { Entry } from '../schema/entry';
import type { VaultTx } from '../storage/transaction';
import type { Vault } from '../storage/vault';
import { mergeEntries, shiftEntry, splitEntry } from './entry-edits';
import {
  dropEntry,
  findEntry,
  normalizeTags,
  normalizeText,
  nowStamp,
  putEntry,
  requireNotFuture,
  requireProject,
  requireTimestamp,
  trashEntry,
  wallTime,
} from './entry-store';

/** A finished entry to add by hand. Overlaps are allowed (reports flag them). */
export type CreateEntryInput = {
  readonly project: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  /** Defaults to the project's `billable`. */
  readonly billable?: boolean;
  readonly start: Timestamp;
  readonly end: Timestamp;
};

/** Fields of an entry that can change. A new start date moves it to another day file. */
export type EntryPatch = Partial<CreateEntryInput>;

/** Dependencies of {@link createEntryService}. */
export type EntryServiceDeps = {
  readonly vault: Vault;
  readonly ids: IdGenerator;
  readonly logger: Logger;
};

/** Changes to finished entries. Deleting moves entries to the vault trash. */
export type EntryService = {
  readonly create: (input: CreateEntryInput) => Promise<Entry>;
  readonly update: (id: string, patch: EntryPatch) => Promise<Entry>;
  /** Moves an entry to a new start, keeping its duration. */
  readonly move: (id: string, start: Timestamp) => Promise<Entry>;
  /** Splits an entry at `at` into two; notes go to the part they fall in. */
  readonly split: (id: string, at: Timestamp) => Promise<readonly [Entry, Entry]>;
  /** Merges entries of one project into the earliest; the others go to the trash. */
  readonly merge: (ids: readonly string[]) => Promise<Entry>;
  readonly delete: (id: string) => Promise<Entry>;
  readonly restore: (id: string) => Promise<Entry>;
};

/** Validates times and range, and that the entry is not in the future. */
const requireRange = (tx: VaultTx, entry: Entry): void => {
  requireTimestamp(entry.start, 'start');
  requireTimestamp(entry.end, 'end');
  if (compareTimestamps(entry.end, entry.start) <= 0) {
    throw new TTimeError(
      'entry.invalid_range',
      `The end (${wallTime(tx, entry.end)}) must be after the start (${wallTime(tx, entry.start)}).`,
      {
        details: { start: entry.start, end: entry.end },
      },
    );
  }
  requireNotFuture(tx, entry.end, 'entry.invalid_range');
};

/** Writes a changed entry, moving it between day files when its start date changed. */
const replaceEntry = async (tx: VaultTx, before: Entry, after: Entry): Promise<void> => {
  requireRange(tx, after);
  await putEntry(tx, after);
  const oldDate = localDateOf(before.start);
  if (oldDate !== localDateOf(after.start)) {
    await dropEntry(tx, before.id, oldDate);
  }
  tx.record({ op: 'update', kind: 'entry', id: before.id, before, after });
};

const applyPatch = (tx: VaultTx, entry: Entry, patch: EntryPatch): Entry => ({
  ...entry,
  ...(patch.project === undefined ? {} : { project: patch.project }),
  ...(patch.description === undefined ? {} : { description: normalizeText(patch.description) }),
  ...(patch.tags === undefined ? {} : { tags: normalizeTags(patch.tags) }),
  ...(patch.billable === undefined ? {} : { billable: patch.billable }),
  ...(patch.start === undefined ? {} : { start: patch.start }),
  ...(patch.end === undefined ? {} : { end: patch.end }),
  updatedAt: nowStamp(tx),
});

const deleteInTx = async (tx: VaultTx, id: string): Promise<Entry> => {
  const { entry, date } = await findEntry(tx, id);
  await trashEntry(tx, entry);
  await dropEntry(tx, id, date);
  tx.record({ op: 'delete', kind: 'entry', id, before: entry, after: null });
  return entry;
};

const restoreInTx = async (tx: VaultTx, id: string): Promise<Entry> => {
  const trashed = await tx.readTrash(id);
  if (trashed === null) {
    throw new TTimeError('entry.not_found', `No trashed entry "${id}"`, { details: { id } });
  }
  const { entry } = trashed;
  const day = await tx.readDay(localDateOf(entry.start));
  if (day.entries.some((e) => e.id === id)) {
    throw new TTimeError('entry.duplicate_id', `Entry "${id}" already exists`, { details: { id } });
  }
  await putEntry(tx, entry);
  tx.removeTrash(id);
  tx.record({ op: 'restore', kind: 'entry', id, before: null, after: entry });
  return entry;
};

/** Creates the entry service. Every operation is one locked vault transaction. */
export const createEntryService = ({ vault, ids, logger }: EntryServiceDeps): EntryService => {
  const run = async <T>(name: string, fn: (tx: VaultTx) => Promise<T>): Promise<T> => {
    const { value, batch } = await vault.transact(fn);
    logger.info(`entry.${name}`, { batch });
    return value;
  };

  return {
    create: (input) =>
      run('create', async (tx) => {
        const project = await requireProject(tx, input.project);
        const entry: Entry = {
          id: ids.newId(),
          project: project.id,
          description: normalizeText(input.description ?? ''),
          start: input.start,
          end: input.end,
          tags: normalizeTags(input.tags ?? []),
          billable: input.billable ?? project.billable,
          notes: [],
          createdBy: tx.actor,
        };
        requireRange(tx, entry);
        await putEntry(tx, entry);
        tx.record({ op: 'create', kind: 'entry', id: entry.id, before: null, after: entry });
        return entry;
      }),
    update: (id, patch) =>
      run('update', async (tx) => {
        const { entry } = await findEntry(tx, id);
        if (patch.project !== undefined && patch.project !== entry.project) {
          await requireProject(tx, patch.project);
        }
        const updated = applyPatch(tx, entry, patch);
        await replaceEntry(tx, entry, updated);
        return updated;
      }),
    move: (id, start) =>
      run('move', async (tx) => {
        requireTimestamp(start, 'start');
        const { entry } = await findEntry(tx, id);
        const moved = { ...shiftEntry(entry, start), updatedAt: nowStamp(tx) };
        await replaceEntry(tx, entry, moved);
        return moved;
      }),
    split: (id, at) =>
      run('split', async (tx) => {
        requireTimestamp(at, 'at');
        const { entry } = await findEntry(tx, id);
        const [first, second] = splitEntry(entry, at, ids.newId(), nowStamp(tx));
        await replaceEntry(tx, entry, first);
        await putEntry(tx, second);
        tx.record({ op: 'create', kind: 'entry', id: second.id, before: null, after: second });
        return [first, second] as const;
      }),
    merge: (entryIds) =>
      run('merge', async (tx) => {
        const located = [];
        for (const id of new Set(entryIds)) {
          located.push((await findEntry(tx, id)).entry);
        }
        const { merged, removed } = mergeEntries(located, nowStamp(tx));
        const [kept] = located.filter((e) => e.id === merged.id);
        for (const entry of removed) {
          await deleteInTx(tx, entry.id);
        }
        if (kept !== undefined) {
          await replaceEntry(tx, kept, merged);
        }
        return merged;
      }),
    delete: (id) => run('delete', (tx) => deleteInTx(tx, id)),
    restore: (id) => run('restore', (tx) => restoreInTx(tx, id)),
  };
};
