import { SCHEMA_VERSION } from '../lib/constants';
import { TTimeError } from '../lib/errors';
import { stringifyLine, stringifyStable } from '../lib/json';
import { dirName } from '../lib/path';
import { sha256Hex } from '../lib/sha256';
import { formatTimestamp, type LocalDate, monthOf } from '../lib/time';
import type { ClockPort } from '../ports/clock-port';
import type { EnvPort } from '../ports/env-port';
import type { FsPort } from '../ports/fs-port';
import type { IdGenerator } from '../ports/id-port';
import type { Logger } from '../ports/logger';
import type { Change } from '../schema/changelog';
import type { Actor } from '../schema/primitives';
import { DEFAULT_SETTINGS, vaultConfigSchema } from '../schema/vault-config';
import { acquireLock, lockDirFor, type LockHandle } from './lock';
import { vaultPaths } from './paths';
import { loadSnapshot, type VaultSnapshot } from './reader';
import { createTx, type TxState, type VaultTx } from './transaction';

/** Everything a vault needs from the platform. `root` must be canonical (symlinks resolved). */
export type VaultDeps = {
  readonly fs: FsPort;
  readonly clock: ClockPort;
  readonly env: EnvPort;
  readonly ids: IdGenerator;
  readonly logger: Logger;
  readonly root: string;
  readonly actor: Actor;
};

/** A written file and the hash of what was written. */
export type WrittenFile = { readonly path: string; readonly sha256: string };

/** The outcome of a committed transaction. */
export type TxResult<T> = {
  readonly value: T;
  readonly batch: string;
  readonly written: readonly WrittenFile[];
};

/** The vault: lock-free snapshot reads and locked transactions. */
export type Vault = {
  readonly root: string;
  readonly actor: Actor;
  /** Loads a snapshot; with `since`, only day files from that date on. Never locks. */
  readonly read: (options?: { readonly since?: LocalDate }) => Promise<VaultSnapshot>;
  /** Runs `fn` as one locked read-modify-write and commits its buffered writes. */
  readonly transact: <T>(fn: (tx: VaultTx) => Promise<T>) => Promise<TxResult<T>>;
};

const commit = async (
  deps: VaultDeps,
  tx: VaultTx,
  state: TxState,
  lock: LockHandle,
): Promise<WrittenFile[]> => {
  const paths = vaultPaths(deps.root);
  const written: WrittenFile[] = [];
  for (const op of state.pending) {
    await lock.refreshIfDue();
    if (op.type === 'remove') {
      await deps.fs.remove(op.path);
      continue;
    }
    await deps.fs.mkdirp(dirName(op.path));
    await deps.fs.writeAtomic(op.path, op.text);
    written.push({ path: op.path, sha256: sha256Hex(op.text) });
  }
  if (state.changes.length > 0) {
    const at = formatTimestamp(tx.now);
    await deps.fs.mkdirp(paths.changelogDir);
    for (const change of state.changes) {
      const line: Change = { ...change, actor: tx.actor, at, batch: tx.batch };
      await deps.fs.appendLine(paths.changelog(monthOf(at)), stringifyLine(line));
    }
  }
  return written;
};

/** Opens the vault at `deps.root`. */
export const createVault = (deps: VaultDeps): Vault => ({
  root: deps.root,
  actor: deps.actor,
  read: (options) =>
    loadSnapshot({ fs: deps.fs, root: deps.root, now: deps.clock.now(), since: options?.since }),
  transact: async (fn) => {
    const lock = await acquireLock(deps, lockDirFor(deps.env, deps.root));
    try {
      const { tx, state } = createTx({
        fs: deps.fs,
        paths: vaultPaths(deps.root),
        now: deps.clock.now(),
        batch: deps.ids.newId(),
        actor: deps.actor,
      });
      await tx.readConfig();
      const value = await fn(tx);
      const written = await commit(deps, tx, state, lock);
      return { value, batch: tx.batch, written };
    } finally {
      await lock.release();
    }
  },
});

/**
 * Creates a new vault at `deps.root`: `ttime.json` with default settings, an empty running file
 * and the standard folders. Refuses to touch a folder that already has a `ttime.json`.
 */
export const initVault = async (deps: VaultDeps, name: string): Promise<void> => {
  const paths = vaultPaths(deps.root);
  const lock = await acquireLock(deps, lockDirFor(deps.env, deps.root));
  try {
    if ((await deps.fs.readText(paths.config)) !== null) {
      throw new TTimeError('input.invalid', `${deps.root} already contains a ttime vault`);
    }
    const config = vaultConfigSchema.parse({
      schema: SCHEMA_VERSION,
      name,
      createdAt: formatTimestamp(deps.clock.now()),
      settings: DEFAULT_SETTINGS,
    });
    for (const dir of [
      paths.clientsDir,
      paths.projectsDir,
      paths.entriesDir,
      paths.changelogDir,
      paths.exportsDir,
      paths.trashEntriesDir,
    ]) {
      await deps.fs.mkdirp(dir);
    }
    await deps.fs.writeAtomic(
      paths.running,
      stringifyStable({ schema: SCHEMA_VERSION, entry: null }),
    );
    await deps.fs.writeAtomic(paths.config, stringifyStable(config));
    deps.logger.info('Vault created', { root: deps.root });
  } finally {
    await lock.release();
  }
};
