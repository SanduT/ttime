import { describe, expect, test } from 'bun:test';

import { isTTimeError } from '../lib/errors';
import { parseJson } from '../lib/json';
import { buildDay, buildEntry, buildProject, buildRunning } from '../testing/builders';
import { createTestVault } from '../testing/test-vault';

const DAY = 'entries/2026/11/2026-11-08.json';

const expectCode = async (promise: Promise<unknown>, code: string): Promise<void> => {
  try {
    await promise;
    expect.unreachable();
  } catch (error) {
    expect(isTTimeError(error) ? error.code : error).toBe(code);
  }
};

describe('broken files are never overwritten', () => {
  test('reading a day file with invalid JSON fails the transaction and leaves the file alone', async () => {
    const t = await createTestVault();
    await t.writeRaw(DAY, '{ "schema": 1, "date": ');
    await expectCode(
      t.vault.transact(async (tx) => {
        const day = await tx.readDay('2026-11-08');
        tx.writeDay({ ...day, entries: [buildEntry()] });
      }),
      'vault.parse_failed',
    );
    expect(await t.readRaw(DAY)).toBe('{ "schema": 1, "date": ');
  });

  test('a schema violation also blocks writes', async () => {
    const t = await createTestVault();
    await t.writeJson(DAY, { schema: 1, date: '2026-11-08', entries: [{ id: 'nope' }] });
    const before = await t.readRaw(DAY);
    await expectCode(
      t.vault.transact((tx) => tx.readDay('2026-11-08')),
      'vault.parse_failed',
    );
    expect(await t.readRaw(DAY)).toBe(before);
  });

  test('a file from a newer schema makes the vault read-only', async () => {
    const t = await createTestVault();
    await t.writeJson('projects/acme-website.json', { ...buildProject(), schema: 2 });
    await expectCode(
      t.vault.transact((tx) => tx.readProject('acme-website')),
      'vault.read_only',
    );
  });

  test('writing a file that was not read in the transaction is refused', async () => {
    const t = await createTestVault();
    await expectCode(
      t.vault.transact((tx) => {
        tx.writeProject(buildProject());
        return Promise.resolve();
      }),
      'internal.invariant',
    );
    expect(await t.readRaw('projects/acme-website.json')).toBeNull();
  });
});

describe('writes', () => {
  test('unknown keys survive a read-modify-write at every level', async () => {
    const t = await createTestVault();
    const entry = {
      ...buildEntry(),
      invoice: 'INV-7',
      notes: [{ at: '2026-11-08T09:30:00+02:00', text: 'x', mood: 'ok' }],
    };
    await t.writeJson(DAY, { ...buildDay('2026-11-08', [entry]), syncedBy: 'git' });
    await t.vault.transact(async (tx) => {
      const day = await tx.readDay('2026-11-08');
      tx.writeDay({ ...day, entries: day.entries.map((e) => ({ ...e, description: 'renamed' })) });
    });
    const saved = parseJson((await t.readRaw(DAY)) ?? '');
    expect(saved).toMatchObject({
      syncedBy: 'git',
      entries: [{ invoice: 'INV-7', description: 'renamed', notes: [{ mood: 'ok' }] }],
    });
  });

  test('day files are sorted by start then id, with sorted keys and a trailing newline', async () => {
    const t = await createTestVault();
    const late = buildEntry({
      start: '2026-11-08T12:00:00+02:00',
      end: '2026-11-08T13:00:00+02:00',
    });
    const early = buildEntry({
      start: '2026-11-08T08:00:00+02:00',
      end: '2026-11-08T09:00:00+02:00',
    });
    await t.vault.transact(async (tx) => {
      const day = await tx.readDay('2026-11-08');
      tx.writeDay({ ...day, entries: [late, early] });
    });
    const text = (await t.readRaw(DAY)) ?? '';
    expect(text.endsWith('}\n')).toBe(true);
    expect(text.indexOf(early.id)).toBeLessThan(text.indexOf(late.id));
    expect(text.indexOf('"billable"')).toBeLessThan(text.indexOf('"createdBy"'));
  });

  test('reads inside a transaction see its own pending writes', async () => {
    const t = await createTestVault();
    await t.vault.transact(async (tx) => {
      const running = buildRunning();
      await tx.readRunning();
      tx.writeRunning({ schema: 1, entry: running });
      expect((await tx.readRunning()).entry?.id).toBe(running.id);
    });
  });

  test('an invalid record is rejected before anything is written', async () => {
    const t = await createTestVault();
    await expectCode(
      t.vault.transact(async (tx) => {
        await tx.readRunning();
        tx.writeRunning({ schema: 1, entry: buildRunning() });
        const day = await tx.readDay('2026-11-08');
        tx.writeDay({ ...day, entries: [buildEntry({ end: '2026-11-08T08:00:00+02:00' })] });
      }),
      'input.invalid',
    );
    expect(parseJson((await t.readRaw('running.json')) ?? '')).toEqual({ schema: 1, entry: null });
  });

  test('a failing transaction writes nothing', async () => {
    const t = await createTestVault();
    const failing = t.vault.transact(async (tx) => {
      tx.writeRunning({ ...(await tx.readRunning()), entry: buildRunning() });
      throw new Error('boom');
    });
    try {
      await failing;
      expect.unreachable();
    } catch (error) {
      expect(String(error)).toContain('boom');
    }
    expect(parseJson((await t.readRaw('running.json')) ?? '')).toEqual({ schema: 1, entry: null });
  });
});
