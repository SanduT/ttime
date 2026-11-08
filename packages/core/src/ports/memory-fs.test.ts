import { describe, expect, test } from 'bun:test';

import { isTTimeError } from '../lib/errors';
import { createMemoryFs } from './memory-fs';

const setup = () => {
  let now = 1000;
  const fs = createMemoryFs({ nowMs: () => now });
  return { fs, tick: () => (now += 1) };
};

const rejectsWith = async (promise: Promise<unknown>, code: 'io.failed'): Promise<void> => {
  try {
    await promise;
    expect.unreachable();
  } catch (error) {
    expect(isTTimeError(error, code)).toBe(true);
  }
};

describe('MemoryFs files', () => {
  test('missing files read as null and writes need an existing parent', async () => {
    const { fs } = setup();
    expect(await fs.readText('/v/a.json')).toBeNull();
    await rejectsWith(fs.writeAtomic('/v/a.json', 'x'), 'io.failed');
    await fs.mkdirp('/v');
    await fs.writeAtomic('/v/a.json', 'x');
    expect(await fs.readText('/v/a.json')).toBe('x');
  });

  test('appendLine adds a newline-terminated line', async () => {
    const { fs } = setup();
    await fs.mkdirp('/v');
    await fs.appendLine('/v/log.jsonl', 'a');
    await fs.appendLine('/v/log.jsonl', 'b');
    expect(await fs.readText('/v/log.jsonl')).toBe('a\nb\n');
    await rejectsWith(fs.appendLine('/nope/x', 'a'), 'io.failed');
  });

  test('stat reports files, directories and missing paths', async () => {
    const { fs, tick } = setup();
    await fs.mkdirp('/v');
    tick();
    await fs.writeAtomic('/v/a', 'ăb');
    expect(await fs.stat('/v/a')).toEqual({ mtimeMs: 1001, size: 3 });
    expect(await fs.stat('/v')).toEqual({ mtimeMs: 1000, size: 0 });
    expect(await fs.stat('/v/missing')).toBeNull();
  });
});

describe('MemoryFs directories', () => {
  test('list returns sorted direct children only', async () => {
    const { fs } = setup();
    await fs.mkdirp('/v/entries/2026');
    await fs.writeAtomic('/v/b.json', '');
    await fs.writeAtomic('/v/a.json', '');
    expect(await fs.list('/v')).toEqual([
      { name: 'a.json', isDir: false },
      { name: 'b.json', isDir: false },
      { name: 'entries', isDir: true },
    ]);
    expect(await fs.list('/missing')).toEqual([]);
    expect((await fs.list('/')).map((e) => e.name)).toEqual(['v']);
  });

  test('mkdirExclusive succeeds once', async () => {
    const { fs } = setup();
    await fs.mkdirp('/locks');
    expect(await fs.mkdirExclusive('/locks/a.lock')).toBe(true);
    expect(await fs.mkdirExclusive('/locks/a.lock')).toBe(false);
    await rejectsWith(fs.mkdirExclusive('/nope/a.lock'), 'io.failed');
  });

  test('remove deletes files, needs recursive for non-empty directories, ignores missing', async () => {
    const { fs } = setup();
    await fs.mkdirp('/v/d');
    await fs.writeAtomic('/v/d/f', 'x');
    await rejectsWith(fs.remove('/v/d'), 'io.failed');
    await fs.remove('/v/d', { recursive: true });
    expect(await fs.stat('/v/d')).toBeNull();
    expect(await fs.readText('/v/d/f')).toBeNull();
    await fs.remove('/v/missing');
    await fs.writeAtomic('/v/g', 'x');
    await fs.remove('/v/g');
    expect(fs.files().size).toBe(0);
  });
});

test('failNext makes exactly one matching operation fail', async () => {
  const { fs } = setup();
  await fs.mkdirp('/v');
  fs.failNext('writeAtomic', 'running.json');
  await fs.writeAtomic('/v/day.json', 'ok');
  await rejectsWith(fs.writeAtomic('/v/running.json', 'x'), 'io.failed');
  await fs.writeAtomic('/v/running.json', 'x');
  expect(fs.files().get('/v/running.json')).toBe('x');
});
