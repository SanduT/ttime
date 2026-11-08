import { describe, expect, test } from 'bun:test';

import { isTTimeError } from '../lib/errors';
import { parseJson } from '../lib/json';
import { sha256Hex } from '../lib/sha256';
import { buildClient, buildDay, buildEntry, buildProject } from '../testing/builders';
import { createTestVault } from '../testing/test-vault';
import { initVault } from './vault';

describe('initVault', () => {
  test('creates ttime.json with defaults, an empty running file and the folders', async () => {
    const t = await createTestVault();
    expect(parseJson((await t.readRaw('ttime.json')) ?? '')).toMatchObject({
      schema: 1,
      name: 'Test vault',
      createdAt: '2026-11-08T10:00:00+02:00',
      settings: { dayStartsAt: '00:00', weekStartsOn: 'monday' },
    });
    expect(parseJson((await t.readRaw('running.json')) ?? '')).toEqual({ schema: 1, entry: null });
    for (const dir of [
      'clients',
      'projects',
      'entries',
      'changelog',
      'exports',
      '.trash/entries',
    ]) {
      expect(await t.fs.stat(`/vault/${dir}`)).not.toBeNull();
    }
  });

  test('refuses a folder that already holds a vault', async () => {
    const t = await createTestVault();
    try {
      await initVault(t.deps, 'Again');
      expect.unreachable();
    } catch (error) {
      expect(isTTimeError(error, 'input.invalid')).toBe(true);
    }
  });
});

describe('transactions', () => {
  test('need an existing ttime.json', async () => {
    const t = await createTestVault({ init: false });
    try {
      await t.vault.transact(() => Promise.resolve());
      expect.unreachable();
    } catch (error) {
      expect(isTTimeError(error, 'vault.missing_config')).toBe(true);
    }
  });

  test('return the batch, the value and a hash per written file', async () => {
    const t = await createTestVault();
    const result = await t.vault.transact(async (tx) => {
      await tx.readProject('acme-website');
      tx.writeProject(buildProject());
      return 'done';
    });
    expect(result.value).toBe('done');
    expect(result.written).toHaveLength(1);
    const text = (await t.readRaw('projects/acme-website.json')) ?? '';
    expect(result.written[0]).toEqual({
      path: '/vault/projects/acme-website.json',
      sha256: sha256Hex(text),
    });
    expect(result.batch).toHaveLength(26);
  });

  test('append one changelog line per change, with actor, time and batch', async () => {
    const t = await createTestVault({ actor: 'mcp' });
    const project = buildProject();
    const { batch } = await t.vault.transact(async (tx) => {
      await tx.readProject(project.id);
      tx.writeProject(project);
      tx.record({ op: 'create', kind: 'project', id: project.id, before: null, after: project });
      tx.record({ op: 'update', kind: 'project', id: project.id, before: project, after: project });
    });
    const lines = ((await t.readRaw('changelog/2026-11.jsonl')) ?? '').trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(parseJson(lines[0] ?? '')).toMatchObject({
      actor: 'mcp',
      op: 'create',
      kind: 'project',
      id: 'acme-website',
      at: '2026-11-08T10:00:00+02:00',
      batch,
      before: null,
    });
  });
});

describe('transaction reads and trash', () => {
  test('list day files, projects and clients from disk', async () => {
    const t = await createTestVault();
    await t.writeJson('entries/2026/11/2026-11-08.json', buildDay('2026-11-08', []));
    await t.writeJson('entries/2025/12/2025-12-31.json', buildDay('2025-12-31', []));
    await t.writeRaw('entries/2026/11/notes.txt', 'ignored');
    await t.writeJson('projects/acme-website.json', buildProject());
    await t.writeJson('clients/acme.json', buildClient());
    await t.writeRaw('clients/Not A Slug.json', '{}');
    await t.vault.transact(async (tx) => {
      expect(await tx.listDays()).toEqual(['2025-12-31', '2026-11-08']);
      expect(await tx.listProjectIds()).toEqual(['acme-website']);
      expect(await tx.listClientIds()).toEqual(['acme']);
      expect((await tx.readClient('acme'))?.name).toBe('Acme GmbH');
      expect(await tx.readDay('2026-11-09')).toEqual(buildDay('2026-11-09', []));
    });
  });

  test('trash files can be written, read back and removed after reading', async () => {
    const t = await createTestVault();
    const entry = buildEntry();
    const trashed = {
      schema: 1 as const,
      deletedAt: '2026-11-08T10:00:00+02:00',
      deletedBy: 'app' as const,
      entry,
    };
    await t.vault.transact(async (tx) => {
      await tx.readTrash(entry.id);
      tx.writeTrash(trashed);
    });
    expect(await t.readRaw(`.trash/entries/${entry.id}.json`)).not.toBeNull();
    await t.vault.transact(async (tx) => {
      expect((await tx.readTrash(entry.id))?.entry.id).toBe(entry.id);
      tx.removeTrash(entry.id);
      expect(await tx.readTrash(entry.id)).toBeNull();
    });
    expect(await t.readRaw(`.trash/entries/${entry.id}.json`)).toBeNull();
  });

  test('removing a trash file that was not read is refused', async () => {
    const t = await createTestVault();
    try {
      await t.vault.transact((tx) => {
        tx.removeTrash('01JC8Z6YQ8K3N7R2T5V9W1X4Z0');
        return Promise.resolve();
      });
      expect.unreachable();
    } catch (error) {
      expect(isTTimeError(error, 'internal.invariant')).toBe(true);
    }
  });

  test('reject invalid dates', async () => {
    const t = await createTestVault();
    try {
      await t.vault.transact((tx) => tx.readDay('2026-13-01'));
      expect.unreachable();
    } catch (error) {
      expect(isTTimeError(error, 'input.invalid')).toBe(true);
    }
  });
});
