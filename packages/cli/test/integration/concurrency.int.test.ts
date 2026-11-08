import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createVault, initVault, LOCK_STALE_MS, lockDirFor, Temporal } from '@ttime/core';
import { afterEach, expect, test } from 'bun:test';

import { makeTempDir, nodeDeps, type TempDir } from './support/temp-vault';

const SUPPORT = join(import.meta.dir, 'support');
// Changelog files are named by the month of the write, which is now.
const monthOf = (): string => Temporal.Now.plainDateISO().toString().slice(0, 7);
const WRITES_PER_PROCESS = 25;
let dir: TempDir | undefined;

afterEach(async () => {
  await dir?.cleanup();
});

const setup = async () => {
  dir = await makeTempDir();
  const root = join(dir.path, 'vault');
  const deps = nodeDeps(dir.path, root);
  await initVault(deps, 'Concurrency');
  return { tempDir: dir.path, root, deps };
};

test('two processes writing the same day file at the same time lose nothing', async () => {
  const { tempDir, root, deps } = await setup();
  const spawnWriter = (label: string) =>
    Bun.spawn(
      ['bun', join(SUPPORT, 'writer.ts'), tempDir, root, label, String(WRITES_PER_PROCESS)],
      {
        stderr: 'pipe',
      },
    );
  const writers = [spawnWriter('a'), spawnWriter('b')];
  const codes = await Promise.all(writers.map((writer) => writer.exited));
  expect(codes).toEqual([0, 0]);

  const snapshot = await createVault(deps).read();
  const entries = snapshot.days.get('2026-11-08')?.entries ?? [];
  expect(entries).toHaveLength(2 * WRITES_PER_PROCESS);
  expect(new Set(entries.map((e) => e.id)).size).toBe(2 * WRITES_PER_PROCESS);
  const changelog = await readFile(join(root, 'changelog', `${monthOf()}.jsonl`), 'utf8');
  expect(changelog.trim().split('\n')).toHaveLength(2 * WRITES_PER_PROCESS);
  expect(await deps.fs.stat(lockDirFor(deps.env, root))).toBeNull();
}, 60_000);

test('a lock held by a killed process is recovered once stale', async () => {
  const { tempDir, root, deps } = await setup();
  const holder = Bun.spawn(['bun', join(SUPPORT, 'hold-lock.ts'), tempDir, root], {
    stdout: 'pipe',
  });
  const reader = holder.stdout.getReader();
  const first = await reader.read();
  expect(new TextDecoder().decode(first.value)).toContain('locked');
  holder.kill('SIGKILL');
  await holder.exited;

  const started = Date.now();
  await createVault(deps).transact(async (tx) => {
    await tx.readRunning();
  });
  expect(Date.now() - started).toBeGreaterThanOrEqual(LOCK_STALE_MS - 2000);
  expect(await deps.fs.stat(lockDirFor(deps.env, root))).toBeNull();
}, 30_000);
