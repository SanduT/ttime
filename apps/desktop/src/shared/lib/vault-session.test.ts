import {
  createManualClock,
  createMemoryFs,
  createRecordingLogger,
  createUlidGenerator,
  errorCodeOf,
  readAppConfig,
} from '@ttime/core';
import { describe, expect, test } from 'bun:test';

import type { VaultControlApi } from '../bridge/vault-api';
import { createVaultSession } from './vault-session';

const env = {
  platform: 'macos',
  homeDir: '/home',
  configDir: '/home/.config/ttime',
  pid: 1,
} as const;

const setup = async (initialRoot: string | null = null) => {
  const clock = createManualClock('2026-11-08T10:00:00[Europe/Bucharest]');
  const fs = createMemoryFs({ nowMs: () => clock.now().epochMilliseconds });
  await fs.mkdirp('/home/a');
  await fs.mkdirp('/home/b');
  const roots: string[] = [];
  let root = initialRoot;
  const control: VaultControlApi = {
    root: () => Promise.resolve(root),
    setRoot: (path) => {
      root = path;
      roots.push(path);
      return Promise.resolve(path);
    },
    env: () => Promise.resolve(env),
    onChanged: () => Promise.resolve(() => null),
    reveal: () => Promise.resolve(null),
    open: () => Promise.resolve(null),
  };
  const session = createVaultSession({
    control,
    fs,
    env,
    clock,
    ids: createUlidGenerator({ clock, randomBytes: (n) => new Uint8Array(n) }),
    logger: createRecordingLogger(),
  });
  return { fs, session, roots, currentRoot: () => root };
};

describe('vault session', () => {
  test('without a vault, current is null', async () => {
    const { session } = await setup();
    expect(await session.current()).toBeNull();
  });

  test('create makes a vault, opens it in Rust and saves the config', async () => {
    const { fs, session, currentRoot } = await setup();
    const vault = await session.create('/home/a', '  Work ');
    expect((await vault.read()).config?.name).toBe('Work');
    expect(currentRoot()).toBe('/home/a');
    expect(await readAppConfig(fs, env)).toEqual({ vault: '/home/a' });
    expect((await session.current())?.root).toBe('/home/a');
  });

  test('create needs a name and a folder without a vault', async () => {
    const { session } = await setup();
    expect(await errorCodeOf(session.create('/home/a', ' '))).toBe('input.invalid');
    await session.create('/home/a', 'Work');
    expect(await errorCodeOf(session.create('/home/a', 'Again'))).toBe('input.invalid');
  });

  test('open accepts an existing vault', async () => {
    const { fs, session } = await setup();
    await session.create('/home/a', 'Work');
    await session.create('/home/b', 'Other');
    await session.open('/home/a');
    expect(await readAppConfig(fs, env)).toEqual({ vault: '/home/a' });
  });

  test('opening a folder without a vault fails and restores the previous root', async () => {
    const { fs, session, currentRoot } = await setup();
    await session.create('/home/a', 'Work');
    expect(await errorCodeOf(session.open('/home/b'))).toBe('vault.missing_config');
    expect(currentRoot()).toBe('/home/a');
    expect(await readAppConfig(fs, env)).toEqual({ vault: '/home/a' });
  });
});
