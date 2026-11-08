import { TTimeError } from '../lib/errors';
import { compareTimestamps, type Timestamp } from '../lib/time';
import type { IdGenerator } from '../ports/id-port';
import type { Logger } from '../ports/logger';
import type { Entry } from '../schema/entry';
import type { VaultTx } from '../storage/transaction';
import type { Vault } from '../storage/vault';
import { normalizeTags, putEntry, requireNotFuture, requireProject } from './entry-store';
import { finishRunning, requireRunning } from './running';
import { clearRunning, startInTx } from './timer-service';

/** What to do with time away from the Mac while a timer ran (PRD 6.5, S7). */
export type IdleChoice = 'keep' | 'discard' | 'discard-stop' | 'assign';

/** An idle stretch and the choice for it. */
export type IdleResolution = {
  readonly choice: IdleChoice;
  /** Last input before going idle. */
  readonly idleSince: Timestamp;
  /** First input after coming back. */
  readonly returnedAt: Timestamp;
  /** For `assign`: the project that gets the idle time. */
  readonly project?: string;
};

/** Dependencies of {@link createIdleService}. */
export type IdleServiceDeps = {
  readonly vault: Vault;
  readonly ids: IdGenerator;
  readonly logger: Logger;
};

/** Resolves idle time; every choice except `keep` is one locked, undoable transaction. */
export type IdleService = {
  readonly resolve: (resolution: IdleResolution) => Promise<void>;
};

/** Ends the running entry at `idleSince` and returns what continues afterwards. */
const endAtIdle = async (tx: VaultTx, resolution: IdleResolution) => {
  const running = await requireRunning(tx);
  if (compareTimestamps(resolution.idleSince, running.start) <= 0) {
    throw new TTimeError('input.invalid', 'The running entry started after you went idle.');
  }
  if (compareTimestamps(resolution.returnedAt, resolution.idleSince) <= 0) {
    throw new TTimeError('input.invalid', 'You came back before you went idle.');
  }
  requireNotFuture(tx, resolution.returnedAt, 'input.invalid');
  await finishRunning(tx, running, resolution.idleSince);
  clearRunning(tx);
  const { project, description, tags, billable } = running;
  return { project, description, tags, billable };
};

/** Adds the idle stretch as a finished entry for `project`. */
const assignIdle = async (tx: VaultTx, ids: IdGenerator, resolution: IdleResolution) => {
  const project = await requireProject(tx, resolution.project ?? '');
  const entry: Entry = {
    id: ids.newId(),
    project: project.id,
    description: '',
    start: resolution.idleSince,
    end: resolution.returnedAt,
    tags: normalizeTags([]),
    billable: project.billable,
    notes: [],
    createdBy: tx.actor,
  };
  await putEntry(tx, entry);
  tx.record({ op: 'create', kind: 'entry', id: entry.id, before: null, after: entry });
};

/**
 * Creates the idle service. `discard` ends the entry at `idleSince` and continues it at
 * `returnedAt`; `discard-stop` only ends it; `assign` also gives the idle stretch to another
 * project; `keep` changes nothing. Time is never removed without one of these choices.
 */
export const createIdleService = ({ vault, ids, logger }: IdleServiceDeps): IdleService => ({
  resolve: async (resolution) => {
    if (resolution.choice === 'keep') {
      logger.info('idle.keep');
      return;
    }
    const { batch } = await vault.transact(async (tx) => {
      const next = await endAtIdle(tx, resolution);
      if (resolution.choice === 'assign') {
        await assignIdle(tx, ids, resolution);
      }
      if (resolution.choice !== 'discard-stop') {
        await startInTx(tx, ids, { ...next, start: resolution.returnedAt });
      }
    });
    logger.info(`idle.${resolution.choice}`, { batch });
  },
});
