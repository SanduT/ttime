import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { isTTimeError } from '@ttime/core';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { createNodeFs } from '../../src/adapters/node-fs';
import { makeTempDir, type TempDir } from './support/temp-vault';

const fs = createNodeFs();
let dir: TempDir;

beforeEach(async () => {
  dir = await makeTempDir();
});
afterEach(async () => {
  await dir.cleanup();
});

describe('NodeFs files', () => {
  test('missing files read as null; writes need an existing parent', async () => {
    const path = join(dir.path, 'a', 'b.json');
    expect(await fs.readText(path)).toBeNull();
    try {
      await fs.writeAtomic(path, 'x');
      expect.unreachable();
    } catch (error) {
      expect(isTTimeError(error, 'io.failed')).toBe(true);
    }
  });

  test('atomic writes replace the file and leave no temp files behind', async () => {
    const path = join(dir.path, 'day.json');
    await fs.writeAtomic(path, 'first\n');
    await fs.writeAtomic(path, 'second\n');
    expect(await fs.readText(path)).toBe('second\n');
    expect(await readdir(dir.path)).toEqual(['day.json']);
  });

  test('a concurrent reader only ever sees a complete old or new version', async () => {
    const path = join(dir.path, 'day.json');
    const versions = ['a'.repeat(200_000), 'b'.repeat(300_000)];
    await fs.writeAtomic(path, versions[0] ?? '');
    const state = { reading: true };
    const seen = new Set<string>();
    const reader = (async () => {
      while (state.reading) {
        seen.add((await fs.readText(path)) ?? '');
      }
    })();
    for (let i = 0; i < 20; i += 1) {
      await fs.writeAtomic(path, versions[i % 2] ?? '');
    }
    state.reading = false;
    await reader;
    for (const text of seen) {
      expect(versions).toContain(text);
    }
  });

  test('appendLine, stat, list and remove behave like MemoryFs', async () => {
    const log = join(dir.path, 'log.jsonl');
    await fs.appendLine(log, 'a');
    await fs.appendLine(log, 'b');
    expect(await fs.readText(log)).toBe('a\nb\n');
    expect((await fs.stat(log))?.size).toBe(4);
    expect(await fs.stat(join(dir.path, 'missing'))).toBeNull();
    await fs.mkdirp(join(dir.path, 'sub', 'deep'));
    expect(await fs.list(dir.path)).toEqual([
      { name: 'log.jsonl', isDir: false },
      { name: 'sub', isDir: true },
    ]);
    expect(await fs.list(join(dir.path, 'nope'))).toEqual([]);
    await fs.remove(join(dir.path, 'sub'), { recursive: true });
    await fs.remove(join(dir.path, 'never-existed'));
    expect(await fs.list(dir.path)).toEqual([{ name: 'log.jsonl', isDir: false }]);
  });

  test('mkdirExclusive succeeds exactly once', async () => {
    const lock = join(dir.path, 'x.lock');
    expect(await fs.mkdirExclusive(lock)).toBe(true);
    expect(await fs.mkdirExclusive(lock)).toBe(false);
  });

  test('other I/O failures surface as io.failed', async () => {
    const file = join(dir.path, 'file');
    await fs.writeAtomic(file, 'x');
    for (const attempt of [
      () => fs.list(file),
      () => fs.mkdirExclusive(join(file, 'child')),
      () => fs.readText(dir.path),
      () => fs.stat(join(file, 'child')),
    ]) {
      try {
        await attempt();
        expect.unreachable();
      } catch (error) {
        expect(isTTimeError(error, 'io.failed')).toBe(true);
      }
    }
  });
});
