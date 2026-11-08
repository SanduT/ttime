import { expect, test } from 'bun:test';

import type { VaultFileApi } from '../bridge/vault-api';
import { createTauriFs } from './tauri-fs';

const fakeApi = (calls: unknown[][]): VaultFileApi => {
  const record =
    <T>(name: string, value: T) =>
    (...args: unknown[]): Promise<T> => {
      calls.push([name, ...args]);
      return Promise.resolve(value);
    };
  return {
    readText: record('readText', 'text'),
    writeAtomic: record('writeAtomic', null),
    appendLine: record('appendLine', null),
    list: record('list', [{ name: 'a.json', isDir: false }]),
    mkdirp: record('mkdirp', null),
    mkdirExclusive: record('mkdirExclusive', true),
    remove: record('remove', null),
    stat: record('stat', { mtimeMs: 5, size: null }),
  };
};

test('every FsPort call goes to the matching Rust command', async () => {
  const calls: unknown[][] = [];
  const fs = createTauriFs(fakeApi(calls));
  expect(await fs.readText('/v/a')).toBe('text');
  await fs.writeAtomic('/v/a', 'x');
  await fs.appendLine('/v/log', 'line');
  expect(await fs.list('/v')).toEqual([{ name: 'a.json', isDir: false }]);
  await fs.mkdirp('/v/d');
  expect(await fs.mkdirExclusive('/v/l')).toBe(true);
  await fs.remove('/v/d', { recursive: true });
  await fs.remove('/v/f');
  expect(await fs.stat('/v/a')).toEqual({ mtimeMs: 5, size: 0 });
  expect(calls).toEqual([
    ['readText', '/v/a'],
    ['writeAtomic', '/v/a', 'x'],
    ['appendLine', '/v/log', 'line'],
    ['list', '/v'],
    ['mkdirp', '/v/d'],
    ['mkdirExclusive', '/v/l'],
    ['remove', '/v/d', true],
    ['remove', '/v/f', false],
    ['stat', '/v/a'],
  ]);
});

test('a missing file stats as null', async () => {
  const fs = createTauriFs({ ...fakeApi([]), stat: () => Promise.resolve(null) });
  expect(await fs.stat('/v/missing')).toBeNull();
});
