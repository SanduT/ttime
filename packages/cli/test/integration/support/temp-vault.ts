import { cp, mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  type Actor,
  createRecordingLogger,
  createVault,
  type Vault,
  type VaultDeps,
} from '@ttime/core';

import { createNodeFs } from '../../../src/adapters/node-fs';
import { createRandomIds } from '../../../src/adapters/random-ids';
import { createSystemClock } from '../../../src/adapters/system-clock';

const FIXTURES = join(import.meta.dir, '..', '..', '..', '..', 'core', 'fixtures', 'vaults');

/** A fresh temporary directory (symlinks resolved), removed by `cleanup`. */
export type TempDir = { readonly path: string; readonly cleanup: () => Promise<void> };

/** Creates a temporary directory under the OS temp dir. Tests never write anywhere else. */
export const makeTempDir = async (): Promise<TempDir> => {
  const path = await realpath(await mkdtemp(join(tmpdir(), 'ttime-test-')));
  return { path, cleanup: () => rm(path, { recursive: true, force: true }) };
};

/** Vault dependencies on the real file system, with config and locks inside `dir`. */
export const nodeDeps = (dir: string, root: string, actor: Actor = 'cli'): VaultDeps => {
  const clock = createSystemClock();
  return {
    fs: createNodeFs(),
    clock,
    env: { platform: 'macos', homeDir: dir, configDir: join(dir, 'config'), pid: process.pid },
    ids: createRandomIds(clock),
    logger: createRecordingLogger(),
    root,
    actor,
  };
};

/** Copies a fixture vault into a temp dir and opens it with NodeFs. */
export const openFixture = async (
  name: string,
): Promise<
  TempDir & { readonly root: string; readonly deps: VaultDeps; readonly vault: Vault }
> => {
  const dir = await makeTempDir();
  const root = join(dir.path, 'vault');
  await cp(join(FIXTURES, name), root, { recursive: true });
  const deps = nodeDeps(dir.path, root);
  return { ...dir, root, deps, vault: createVault(deps) };
};
