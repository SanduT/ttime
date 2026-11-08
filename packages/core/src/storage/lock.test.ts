import { describe, expect, test } from 'bun:test';

import { LOCK_REFRESH_MS, LOCK_STALE_MS, LOCK_TIMEOUT_MS } from '../lib/constants';
import { isTTimeError } from '../lib/errors';
import { parseJson } from '../lib/json';
import { createTestVault, type TestVault } from '../testing/test-vault';
import { acquireLock, lockDirFor } from './lock';

const setup = async (): Promise<TestVault & { lockDir: string }> => {
  const t = await createTestVault({ init: false });
  return { ...t, lockDir: lockDirFor(t.env, t.root) };
};

const deps = (t: TestVault) => ({ ...t.deps });

const ownerOf = async (t: TestVault, lockDir: string): Promise<unknown> =>
  parseJson((await t.fs.readText(`${lockDir}/owner.json`)) ?? 'null');

describe('acquiring', () => {
  test('the lock lives in the config dir, named by the hash of the vault path', async () => {
    const t = await setup();
    expect(t.lockDir).toMatch(/^\/config\/locks\/[0-9a-f]{64}\.lock$/);
  });

  test('acquire writes an owner file and release removes the lock', async () => {
    const t = await setup();
    const lock = await acquireLock(deps(t), t.lockDir);
    expect(await ownerOf(t, t.lockDir)).toMatchObject({ pid: 4242, actor: 'app' });
    await lock.release();
    expect(await t.fs.stat(t.lockDir)).toBeNull();
  });

  test('a held, fresh lock makes others wait and then time out with vault.locked', async () => {
    const t = await setup();
    const holder = await acquireLock(deps(t), t.lockDir);
    const started = t.clock.now().epochMilliseconds;
    // The holder keeps working (and refreshing) while the second process waits.
    const sleep = async (ms: number): Promise<void> => {
      await t.clock.sleep(ms);
      await holder.refreshIfDue();
    };
    const refreshing = { ...deps(t), clock: { now: t.clock.now, sleep } };
    try {
      await acquireLock(refreshing, t.lockDir);
      expect.unreachable();
    } catch (error) {
      expect(isTTimeError(error, 'vault.locked')).toBe(true);
    }
    expect(t.clock.now().epochMilliseconds - started).toBeGreaterThan(LOCK_TIMEOUT_MS);
  });
});

describe('stale locks', () => {
  test('a lock not refreshed for 10 seconds is broken and taken over, with a warning', async () => {
    const t = await setup();
    await acquireLock(deps(t), t.lockDir);
    t.clock.advance({ milliseconds: LOCK_STALE_MS + 1 });
    const lock = await acquireLock(deps(t), t.lockDir);
    expect(t.logger.lines.some((l) => l.level === 'warn' && l.message.includes('stale'))).toBe(
      true,
    );
    await lock.release();
    expect(await t.fs.stat(t.lockDir)).toBeNull();
  });

  test('a lock directory without an owner file is stale only once it is old', async () => {
    const t = await setup();
    await t.fs.mkdirp(t.lockDir);
    t.clock.advance({ milliseconds: LOCK_STALE_MS + 1 });
    const lock = await acquireLock(deps(t), t.lockDir);
    expect(await ownerOf(t, t.lockDir)).toMatchObject({ pid: 4242 });
    await lock.release();
  });

  test('a leftover breaker directory from a crashed process is cleaned up', async () => {
    const t = await setup();
    await acquireLock(deps(t), t.lockDir);
    await t.fs.mkdirp(`${t.lockDir}.breaking`);
    t.clock.advance({ milliseconds: LOCK_STALE_MS + 1 });
    const lock = await acquireLock(deps(t), t.lockDir);
    expect(await t.fs.stat(`${t.lockDir}.breaking`)).toBeNull();
    await lock.release();
  });
});

describe('holding', () => {
  test('refreshIfDue rewrites the owner file only after the refresh interval', async () => {
    const t = await setup();
    const lock = await acquireLock(deps(t), t.lockDir);
    const first = await ownerOf(t, t.lockDir);
    await lock.refreshIfDue();
    expect(await ownerOf(t, t.lockDir)).toEqual(first);
    t.clock.advance({ milliseconds: LOCK_REFRESH_MS });
    await lock.refreshIfDue();
    expect(await ownerOf(t, t.lockDir)).toMatchObject({
      refreshedAt: t.clock.now().epochMilliseconds,
    });
  });

  test('a lock taken over by another process is reported, not released', async () => {
    const t = await setup();
    const lock = await acquireLock(deps(t), t.lockDir);
    t.clock.advance({ milliseconds: LOCK_STALE_MS + 1 });
    const other = await acquireLock(deps(t), t.lockDir);
    try {
      await lock.refreshIfDue();
      expect.unreachable();
    } catch (error) {
      expect(isTTimeError(error, 'vault.lock_lost')).toBe(true);
    }
    await lock.release();
    expect(await t.fs.stat(t.lockDir)).not.toBeNull();
    expect(t.logger.lines.some((l) => l.level === 'error')).toBe(true);
    await other.release();
  });
});
