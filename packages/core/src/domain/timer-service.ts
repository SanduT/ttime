import { SCHEMA_VERSION } from '../lib/constants';
import { TTimeError } from '../lib/errors';
import { compareTimestamps, type Timestamp } from '../lib/time';
import type { IdGenerator } from '../ports/id-port';
import type { Logger } from '../ports/logger';
import type { Entry, RunningEntry } from '../schema/entry';
import type { VaultTx } from '../storage/transaction';
import type { Vault } from '../storage/vault';
import {
  lastEntry,
  normalizeTags,
  normalizeText,
  nowStamp,
  requireNotFuture,
  requireProject,
  requireTimestamp,
  trashEntry,
} from './entry-store';
import {
  clearBackdate,
  finishRunning,
  type OnConflict,
  readActiveRunning,
  requireRunning,
} from './running';

/** What to start. `start` defaults to now; a backdated start follows the backdating rules. */
export type StartInput = {
  readonly project: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  /** Defaults to the project's `billable`. */
  readonly billable?: boolean;
  readonly start?: Timestamp;
  /** For a backdated start with nothing running. Default `cancel`. */
  readonly onConflict?: OnConflict;
};

/** The entry that started and the one it stopped (null if none, or if it was zero-length). */
export type StartResult = { readonly started: RunningEntry; readonly stopped: Entry | null };

/** Changes to the running entry. */
export type RunningPatch = Omit<Partial<StartInput>, 'onConflict'> & {
  readonly onConflict?: OnConflict;
};

/** Dependencies of {@link createTimerService}. */
export type TimerServiceDeps = {
  readonly vault: Vault;
  readonly ids: IdGenerator;
  readonly logger: Logger;
};

/** Start, stop, switch, pause, resume, notes and edits of the one running entry. */
export type TimerService = {
  readonly start: (input: StartInput) => Promise<StartResult>;
  /** Same as `start`: the running entry stops at the new start (gapless). */
  readonly switchTo: (input: StartInput) => Promise<StartResult>;
  /** Stops at `at` or now. Returns null when the entry was zero-length and discarded. */
  readonly stop: (options?: { readonly at?: Timestamp }) => Promise<Entry | null>;
  /** Pause is a stop (PRD rule 3). */
  readonly pause: () => Promise<Entry | null>;
  /** Starts a new entry now copying project, description, tags and billable of the last one. */
  readonly resume: () => Promise<StartResult>;
  readonly addNote: (text: string) => Promise<RunningEntry>;
  /** Moves the running entry to the trash and stops tracking. */
  readonly discard: () => Promise<RunningEntry>;
  readonly editRunning: (patch: RunningPatch) => Promise<RunningEntry>;
};

const clearRunning = (tx: VaultTx): void => {
  tx.writeRunning({ schema: SCHEMA_VERSION, entry: null });
};

const startInTx = async (
  tx: VaultTx,
  ids: IdGenerator,
  input: StartInput,
): Promise<StartResult> => {
  const project = await requireProject(tx, input.project);
  const start = input.start ?? nowStamp(tx);
  requireTimestamp(start, 'start');
  requireNotFuture(tx, start, 'timer.invalid_start');
  const { running } = await readActiveRunning(tx);
  let stopped: Entry | null = null;
  if (running === null) {
    await clearBackdate(tx, start, input.onConflict ?? 'cancel');
  } else if (compareTimestamps(start, running.start) <= 0) {
    throw new TTimeError(
      'timer.invalid_start',
      `Start ${start} is not after the running entry's start`,
      {
        details: { start, runningStart: running.start },
      },
    );
  } else {
    stopped = await finishRunning(tx, running, start);
  }
  const started: RunningEntry = {
    id: ids.newId(),
    project: project.id,
    description: normalizeText(input.description ?? ''),
    start,
    tags: normalizeTags(input.tags ?? []),
    billable: input.billable ?? project.billable,
    notes: [],
    createdBy: tx.actor,
  };
  tx.writeRunning({ schema: SCHEMA_VERSION, entry: started });
  tx.record({ op: 'start', kind: 'entry', id: started.id, before: null, after: started });
  return { started, stopped };
};

const editInTx = async (tx: VaultTx, patch: RunningPatch): Promise<RunningEntry> => {
  const running = await requireRunning(tx);
  if (patch.project !== undefined) {
    await requireProject(tx, patch.project);
  }
  if (patch.start !== undefined) {
    requireTimestamp(patch.start, 'start');
    requireNotFuture(tx, patch.start, 'timer.invalid_start');
    await clearBackdate(tx, patch.start, patch.onConflict ?? 'cancel');
  }
  const edited: RunningEntry = {
    ...running,
    ...(patch.project === undefined ? {} : { project: patch.project }),
    ...(patch.description === undefined ? {} : { description: normalizeText(patch.description) }),
    ...(patch.tags === undefined ? {} : { tags: normalizeTags(patch.tags) }),
    ...(patch.billable === undefined ? {} : { billable: patch.billable }),
    ...(patch.start === undefined ? {} : { start: patch.start }),
    updatedAt: nowStamp(tx),
  };
  tx.writeRunning({ schema: SCHEMA_VERSION, entry: edited });
  tx.record({ op: 'update', kind: 'entry', id: running.id, before: running, after: edited });
  return edited;
};

/** Creates the timer service. Every operation is one locked vault transaction. */
export const createTimerService = ({ vault, ids, logger }: TimerServiceDeps): TimerService => {
  const run = async <T>(name: string, fn: (tx: VaultTx) => Promise<T>): Promise<T> => {
    const { value, batch } = await vault.transact(fn);
    logger.info(`timer.${name}`, { batch });
    return value;
  };

  const start = (input: StartInput): Promise<StartResult> =>
    run('start', (tx) => startInTx(tx, ids, input));

  const stop = (options: { readonly at?: Timestamp } = {}): Promise<Entry | null> =>
    run('stop', async (tx) => {
      const { running, completed } = await readActiveRunning(tx);
      if (completed !== null) {
        return completed;
      }
      if (running === null) {
        throw new TTimeError('timer.not_running', 'Nothing is running');
      }
      const end = options.at ?? nowStamp(tx);
      requireTimestamp(end, 'end');
      requireNotFuture(tx, end, 'timer.invalid_end');
      const entry = await finishRunning(tx, running, end);
      clearRunning(tx);
      return entry;
    });

  return {
    start,
    switchTo: start,
    stop,
    pause: () => stop(),
    resume: () =>
      run('resume', async (tx) => {
        const { running } = await readActiveRunning(tx);
        if (running !== null) {
          throw new TTimeError('timer.already_running', 'An entry is already running');
        }
        const last = await lastEntry(tx);
        if (last === null) {
          throw new TTimeError('entry.not_found', 'There is no entry to resume');
        }
        const { project, description, tags, billable } = last;
        return startInTx(tx, ids, { project, description, tags, billable });
      }),
    addNote: (text) =>
      run('note', async (tx) => {
        const note = normalizeText(text);
        if (note === '') {
          throw new TTimeError('input.invalid', 'A note needs text');
        }
        const running = await requireRunning(tx);
        const after: RunningEntry = {
          ...running,
          notes: [...running.notes, { at: nowStamp(tx), text: note }],
        };
        tx.writeRunning({ schema: SCHEMA_VERSION, entry: after });
        tx.record({ op: 'note', kind: 'entry', id: running.id, before: running, after });
        return after;
      }),
    discard: () =>
      run('discard', async (tx) => {
        const running = await requireRunning(tx);
        const end = nowStamp(tx);
        if (compareTimestamps(end, running.start) > 0) {
          await trashEntry(tx, { ...running, end });
        }
        clearRunning(tx);
        tx.record({ op: 'delete', kind: 'entry', id: running.id, before: running, after: null });
        return running;
      }),
    editRunning: (patch) => run('edit', (tx) => editInTx(tx, patch)),
  };
};
