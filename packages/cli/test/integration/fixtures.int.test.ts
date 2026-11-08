import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { buildEntry, isTTimeError, parseJson } from '@ttime/core';
import { afterEach, describe, expect, test } from 'bun:test';

import { openFixture } from './support/temp-vault';

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

const open = async (name: string) => {
  const fixture = await openFixture(name);
  cleanups.push(fixture.cleanup);
  return fixture;
};

describe('fixture vaults on the real file system', () => {
  test('basic loads cleanly, including the entry that crosses midnight', async () => {
    const { vault } = await open('basic');
    const snapshot = await vault.read();
    expect(snapshot.issues).toEqual([]);
    expect(snapshot.projects.size).toBe(2);
    expect(snapshot.days.get('2026-11-07')?.entries[0]?.end).toBe('2026-11-08T01:15:00+02:00');
  });

  test('broken files are reported and never overwritten', async () => {
    const { vault, root } = await open('broken');
    const brokenPath = join(root, 'entries/2026/11/2026-11-07.json');
    const before = await readFile(brokenPath, 'utf8');
    const snapshot = await vault.read();
    expect(snapshot.issues.map((i) => i.code).sort()).toEqual([
      'file.invalid_json',
      'file.invalid_schema',
      'project.unknown_client',
    ]);
    try {
      await vault.transact(async (tx) => {
        const day = await tx.readDay('2026-11-07');
        tx.writeDay({
          ...day,
          entries: [
            buildEntry({ start: '2026-11-07T09:00:00+02:00', end: '2026-11-07T10:00:00+02:00' }),
          ],
        });
      });
      expect.unreachable();
    } catch (error) {
      expect(isTTimeError(error, 'vault.parse_failed')).toBe(true);
    }
    expect(await readFile(brokenPath, 'utf8')).toBe(before);
  });

  test('unknown keys survive a rewrite on disk', async () => {
    const { vault, root } = await open('basic');
    await vault.transact(async (tx) => {
      const day = await tx.readDay('2026-11-06');
      tx.writeDay({
        ...day,
        entries: day.entries.map((e) => ({ ...e, description: `${e.description}!` })),
      });
    });
    const saved = parseJson(await readFile(join(root, 'entries/2026/11/2026-11-06.json'), 'utf8'));
    expect(saved).toMatchObject({
      entries: [
        { invoiceLine: 'INV-2026-11 #1', description: 'auth refactor!' },
        { description: 'inbox!' },
      ],
    });
  });

  test('an interrupted stop loads as not running', async () => {
    const { vault } = await open('interrupted-stop');
    const snapshot = await vault.read();
    expect(snapshot.running).toBeNull();
    expect(snapshot.issues.map((i) => i.code)).toEqual(['running.already_stopped']);
  });

  test('a newer schema opens read-only and refuses writes', async () => {
    const { vault } = await open('newer-schema');
    expect((await vault.read()).readOnly).toBe(true);
    try {
      await vault.transact(() => Promise.resolve());
      expect.unreachable();
    } catch (error) {
      expect(isTTimeError(error, 'vault.read_only')).toBe(true);
    }
  });
});
