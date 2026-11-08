import { TTimeError } from '../lib/errors';
import type { Logger } from '../ports/logger';
import type { Change, ChangeOp } from '../schema/changelog';
import type { Actor } from '../schema/primitives';
import type { Vault } from '../storage/vault';
import { type Batch, groupBatches, type UndoState, undoState } from './undo-history';
import { currentRecord, restoreRecord, sameRecord } from './undo-records';

/** Dependencies of {@link createUndoService}. */
export type UndoServiceDeps = { readonly vault: Vault; readonly logger: Logger };

/** Undo and redo through changelog batches (ARCHITECTURE 4.3). */
export type UndoService = {
  /** Batches of the newest `months` changelog files (default 2), newest first. */
  readonly history: (options?: { readonly months?: number }) => Promise<readonly Batch[]>;
  /** What Undo and Redo would act on for `actor` (default: this vault's actor). */
  readonly state: (actor?: Actor) => Promise<UndoState>;
  /**
   * Reverts batch `batch` as one new batch. Refuses with `undo.conflict` when a record changed
   * since, so a later edit is never lost. Returns the new batch ID.
   */
  readonly undo: (batch: string) => Promise<string>;
};

/** The op an undo line records: what the revert did to the record. */
const revertOp = (change: Change): ChangeOp => {
  if (change.after === null) {
    return change.kind === 'entry' ? 'restore' : 'create';
  }
  return change.before === null ? 'delete' : 'update';
};

const DEFAULT_MONTHS = 2;

/** Creates the undo service. */
export const createUndoService = ({ vault, logger }: UndoServiceDeps): UndoService => {
  const batches = async (months = DEFAULT_MONTHS) => groupBatches(await vault.history({ months }));

  return {
    history: async (options) => (await batches(options?.months)).reverse(),
    state: async (actor = vault.actor) => undoState(await batches(), actor),
    undo: async (batch) => {
      const { batch: undoBatch } = await vault.transact(async (tx) => {
        const changes = await tx.readBatch(batch);
        if (changes.length === 0) {
          throw new TTimeError('undo.not_found', 'There is nothing to undo for that change.', {
            details: { batch },
          });
        }
        for (const change of [...changes].reverse()) {
          const current = await currentRecord(tx, change.kind, change.id);
          if (!sameRecord(current, change.after)) {
            throw new TTimeError(
              'undo.conflict',
              'This change was edited again since, so it cannot be undone.',
              { details: { batch, kind: change.kind, id: change.id } },
            );
          }
          await restoreRecord(tx, change.kind, change.id, change.before);
          tx.record({
            op: revertOp(change),
            kind: change.kind,
            id: change.id,
            before: change.after,
            after: change.before,
            undoes: batch,
          });
        }
      });
      logger.info('undo', { batch, undoBatch });
      return undoBatch;
    },
  };
};
