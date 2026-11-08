import { z } from 'zod';

import { LOCK_REFRESH_MS, LOCK_RETRY_MS, LOCK_STALE_MS, LOCK_TIMEOUT_MS } from '../lib/constants';
import { TTimeError } from '../lib/errors';
import { stringifyStable, tryParseJson } from '../lib/json';
import { dirName, joinPath } from '../lib/path';
import { sha256Hex } from '../lib/sha256';
import type { ClockPort } from '../ports/clock-port';
import type { EnvPort } from '../ports/env-port';
import type { FsPort } from '../ports/fs-port';
import type { IdGenerator } from '../ports/id-port';
import type { Logger } from '../ports/logger';
import { actorSchema } from '../schema/primitives';

const ownerSchema = z.looseObject({
  token: z.string(),
  pid: z.number(),
  actor: actorSchema,
  acquiredAt: z.number(),
  refreshedAt: z.number(),
});

type Owner = z.infer<typeof ownerSchema>;

/** Dependencies of the vault lock. */
export type LockDeps = {
  readonly fs: FsPort;
  readonly clock: ClockPort;
  readonly env: EnvPort;
  readonly ids: IdGenerator;
  readonly logger: Logger;
  readonly actor: Owner['actor'];
};

/** A held lock. */
export type LockHandle = {
  /** Rewrites `owner.json` when the last refresh is older than the refresh interval. */
  readonly refreshIfDue: () => Promise<void>;
  /** Releases the lock if this process still owns it. */
  readonly release: () => Promise<void>;
};

/** `<configDir>/locks/<sha256 of the canonical vault path>.lock`. Callers pass a canonical root. */
export const lockDirFor = (env: EnvPort, vaultRoot: string): string =>
  joinPath(env.configDir, 'locks', `${sha256Hex(vaultRoot)}.lock`);

const ownerPath = (lockDir: string): string => joinPath(lockDir, 'owner.json');

const readOwner = async (fs: FsPort, lockDir: string): Promise<Owner | null> => {
  const text = await fs.readText(ownerPath(lockDir));
  const json = text === null ? null : tryParseJson(text);
  if (json?.ok !== true) {
    return null;
  }
  const parsed = ownerSchema.safeParse(json.value);
  return parsed.success ? parsed.data : null;
};

type LockState = { readonly stale: boolean; readonly token: string | null };

/** A lock is stale when its owner has not refreshed it, or, without an owner file, by its age. */
const inspect = async (deps: LockDeps, lockDir: string): Promise<LockState | null> => {
  const now = deps.clock.now().epochMilliseconds;
  const owner = await readOwner(deps.fs, lockDir);
  if (owner !== null) {
    return { stale: now - owner.refreshedAt > LOCK_STALE_MS, token: owner.token };
  }
  const stat = await deps.fs.stat(lockDir);
  return stat === null ? null : { stale: now - stat.mtimeMs > LOCK_STALE_MS, token: null };
};

/**
 * Breaks a stale lock. A second directory, `<lock>.breaking`, makes the check-and-remove exclusive,
 * so two processes can't both decide a lock is stale and one remove the other's fresh lock.
 */
const breakStale = async (deps: LockDeps, lockDir: string, seen: LockState): Promise<void> => {
  const breaker = `${lockDir}.breaking`;
  if (!(await deps.fs.mkdirExclusive(breaker))) {
    const stat = await deps.fs.stat(breaker);
    if (stat !== null && deps.clock.now().epochMilliseconds - stat.mtimeMs > LOCK_STALE_MS) {
      await deps.fs.remove(breaker, { recursive: true });
    }
    return;
  }
  try {
    const current = await inspect(deps, lockDir);
    if (current?.stale === true && current.token === seen.token) {
      await deps.fs.remove(lockDir, { recursive: true });
      deps.logger.warn('Removed a stale vault lock', { lockDir, owner: seen.token });
    }
  } finally {
    await deps.fs.remove(breaker, { recursive: true });
  }
};

const writeOwner = async (deps: LockDeps, lockDir: string, owner: Owner): Promise<void> => {
  await deps.fs.writeAtomic(ownerPath(lockDir), stringifyStable(owner));
};

const holdLock = (deps: LockDeps, lockDir: string, first: Owner): LockHandle => {
  let owner = first;
  const stillOurs = async (): Promise<boolean> =>
    (await readOwner(deps.fs, lockDir))?.token === owner.token;
  return {
    refreshIfDue: async () => {
      const now = deps.clock.now().epochMilliseconds;
      if (now - owner.refreshedAt < LOCK_REFRESH_MS) {
        return;
      }
      if (!(await stillOurs())) {
        throw new TTimeError('vault.lock_lost', 'Another process took over the vault lock');
      }
      owner = { ...owner, refreshedAt: now };
      await writeOwner(deps, lockDir, owner);
    },
    release: async () => {
      if (await stillOurs()) {
        await deps.fs.remove(lockDir, { recursive: true });
        return;
      }
      deps.logger.error('The vault lock was taken over before release', { lockDir });
    },
  };
};

/** Acquires the cross-process vault lock, waiting for a holder and breaking stale locks. */
export const acquireLock = async (deps: LockDeps, lockDir: string): Promise<LockHandle> => {
  await deps.fs.mkdirp(dirName(lockDir));
  const deadline = deps.clock.now().epochMilliseconds + LOCK_TIMEOUT_MS;
  for (;;) {
    if (await deps.fs.mkdirExclusive(lockDir)) {
      const now = deps.clock.now().epochMilliseconds;
      const owner: Owner = {
        token: deps.ids.newId(),
        pid: deps.env.pid,
        actor: deps.actor,
        acquiredAt: now,
        refreshedAt: now,
      };
      await writeOwner(deps, lockDir, owner);
      return holdLock(deps, lockDir, owner);
    }
    const state = await inspect(deps, lockDir);
    if (state?.stale === true) {
      await breakStale(deps, lockDir, state);
    } else {
      await deps.clock.sleep(LOCK_RETRY_MS);
    }
    if (deps.clock.now().epochMilliseconds > deadline) {
      throw new TTimeError('vault.locked', 'The vault is busy. Try again in a moment.', {
        details: { lockDir },
      });
    }
  }
};
