import { describe, expect, test } from 'bun:test';

import { createMemoryFs } from '../ports/memory-fs';
import { errorCodeOf } from '../testing/errors';
import { appConfigPath, readAppConfig, writeAppConfig } from './app-config';

const env = {
  platform: 'macos',
  homeDir: '/home',
  configDir: '/home/.config/ttime',
  pid: 1,
} as const;

const setup = () => createMemoryFs({ nowMs: () => 0 });

describe('app config', () => {
  test('a missing file reads as null', async () => {
    expect(await readAppConfig(setup(), env)).toBeNull();
    expect(appConfigPath(env)).toBe('/home/.config/ttime/config.json');
  });

  test('writing creates the folder and the file', async () => {
    const fs = setup();
    await writeAppConfig(fs, env, { vault: '/Users/me/ttime' });
    expect(await fs.readText(appConfigPath(env))).toBe('{\n  "vault": "/Users/me/ttime"\n}\n');
    expect(await readAppConfig(fs, env)).toEqual({ vault: '/Users/me/ttime' });
  });

  test('unknown keys are kept when the vault changes', async () => {
    const fs = setup();
    await fs.mkdirp(env.configDir);
    await fs.writeAtomic(appConfigPath(env), '{ "vault": "/old", "editor": "vim" }');
    await writeAppConfig(fs, env, { vault: '/new' });
    expect(await readAppConfig(fs, env)).toEqual({ vault: '/new', editor: 'vim' });
  });

  test('a broken file is reported and never overwritten', async () => {
    const fs = setup();
    await fs.mkdirp(env.configDir);
    for (const text of ['{ "vault": ', '{ "vault": 42 }']) {
      await fs.writeAtomic(appConfigPath(env), text);
      expect(await errorCodeOf(readAppConfig(fs, env))).toBe('config.parse_failed');
      expect(await errorCodeOf(writeAppConfig(fs, env, { vault: '/new' }))).toBe(
        'config.parse_failed',
      );
      expect(await fs.readText(appConfigPath(env))).toBe(text);
    }
  });
});
