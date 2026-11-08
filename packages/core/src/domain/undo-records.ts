import { SCHEMA_VERSION } from '../lib/constants';
import { TTimeError } from '../lib/errors';
import { stringifyStable } from '../lib/json';
import { localDateOf } from '../lib/time';
import type { ChangeKind } from '../schema/changelog';
import { clientSchema } from '../schema/client';
import { entrySchema, runningEntrySchema } from '../schema/entry';
import { projectSchema } from '../schema/project';
import { vaultConfigSchema } from '../schema/vault-config';
import type { VaultTx } from '../storage/transaction';
import { dropEntry, findEntry, type LocatedEntry, putEntry, trashEntry } from './entry-store';

/** The live version of a record, as a changelog `after` would show it; null when absent. */
const findLocated = async (tx: VaultTx, id: string): Promise<LocatedEntry | null> => {
  try {
    return await findEntry(tx, id);
  } catch (error: unknown) {
    if (error instanceof TTimeError && error.code === 'entry.not_found') {
      return null;
    }
    throw error;
  }
};

const currentEntry = async (tx: VaultTx, id: string): Promise<unknown> => {
  const { entry } = await tx.readRunning();
  if (entry?.id === id) {
    return entry;
  }
  return (await findLocated(tx, id))?.entry ?? null;
};

/** The current state of record `kind`/`id`, comparable to a changelog `after`. */
export const currentRecord = async (
  tx: VaultTx,
  kind: ChangeKind,
  id: string,
): Promise<unknown> => {
  switch (kind) {
    case 'entry': {
      return currentEntry(tx, id);
    }
    case 'project': {
      return tx.readProject(id);
    }
    case 'client': {
      return tx.readClient(id);
    }
    case 'config': {
      return tx.readConfig();
    }
  }
};

/** True when two records are the same data (key order ignored). */
export const sameRecord = (a: unknown, b: unknown): boolean =>
  stringifyStable(a) === stringifyStable(b);

/** Takes entry `id` out of `running.json` and its day file; trashes a finished one. */
const removeEntry = async (tx: VaultTx, id: string): Promise<void> => {
  const running = await tx.readRunning();
  if (running.entry?.id === id) {
    tx.writeRunning({ schema: SCHEMA_VERSION, entry: null });
  }
  const located = await findLocated(tx, id);
  if (located !== null) {
    await trashEntry(tx, located.entry);
    await dropEntry(tx, id, located.date);
  }
};

const restoreEntry = async (tx: VaultTx, id: string, before: unknown): Promise<void> => {
  if (before === null) {
    await removeEntry(tx, id);
    return;
  }
  const located = await findLocated(tx, id);
  const running = await tx.readRunning();
  if ((await tx.readTrash(id)) !== null) {
    tx.removeTrash(id);
  }
  const finished = entrySchema.safeParse(before);
  if (finished.success) {
    if (running.entry?.id === id) {
      tx.writeRunning({ schema: SCHEMA_VERSION, entry: null });
    }
    if (located !== null && located.date !== localDateOf(finished.data.start)) {
      await dropEntry(tx, id, located.date);
    }
    await putEntry(tx, finished.data);
    return;
  }
  if (running.entry !== null && running.entry.id !== id) {
    throw new TTimeError('undo.conflict', 'Another entry is running now. Stop it, then undo.');
  }
  if (located !== null) {
    await dropEntry(tx, id, located.date);
  }
  tx.writeRunning({ schema: SCHEMA_VERSION, entry: runningEntrySchema.parse(before) });
};

const restoreProject = async (tx: VaultTx, id: string, before: unknown): Promise<void> => {
  if (before !== null) {
    tx.writeProject(projectSchema.parse(before));
    return;
  }
  const current = await tx.readProject(id);
  if (current !== null) {
    tx.writeProject({ ...current, status: 'archived' });
  }
};

const restoreClient = async (tx: VaultTx, id: string, before: unknown): Promise<void> => {
  if (before !== null) {
    tx.writeClient(clientSchema.parse(before));
    return;
  }
  const current = await tx.readClient(id);
  if (current !== null) {
    tx.writeClient({ ...current, archived: true });
  }
};

/**
 * Puts record `kind`/`id` back to `before`. Nothing is hard-deleted: an entry that did not
 * exist goes to the trash, and a project or client that did not exist is archived.
 */
export const restoreRecord = async (
  tx: VaultTx,
  kind: ChangeKind,
  id: string,
  before: unknown,
): Promise<void> => {
  switch (kind) {
    case 'entry': {
      await restoreEntry(tx, id, before);
      return;
    }
    case 'project': {
      await restoreProject(tx, id, before);
      return;
    }
    case 'client': {
      await restoreClient(tx, id, before);
      return;
    }
    case 'config': {
      tx.writeConfig(vaultConfigSchema.parse(before));
      return;
    }
  }
};
