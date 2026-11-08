import { describe, expect, test } from 'bun:test';

import { buildClient, buildDay, buildEntry, buildProject, buildRunning } from '../testing/builders';
import { createTestVault, type TestVault } from '../testing/test-vault';

const seed = async (t: TestVault): Promise<void> => {
  await t.writeJson('clients/acme.json', buildClient());
  await t.writeJson('projects/acme-website.json', buildProject());
};

const codes = (issues: readonly { code: string }[]): string[] => issues.map((i) => i.code).sort();

describe('loading', () => {
  test('a clean vault loads config, records, days and the running entry without issues', async () => {
    const t = await createTestVault();
    await seed(t);
    const entry = buildEntry();
    await t.writeJson('entries/2026/11/2026-11-08.json', buildDay('2026-11-08', [entry]));
    const running = buildRunning({ start: '2026-11-08T10:00:00+02:00' });
    await t.writeJson('running.json', { schema: 1, entry: running });
    const snapshot = await t.vault.read();
    expect(snapshot.issues).toEqual([]);
    expect(snapshot.config?.name).toBe('Test vault');
    expect(snapshot.clients.get('acme')?.name).toBe('Acme GmbH');
    expect(snapshot.projects.get('acme-website')?.color).toBe('#4F7CFF');
    expect(snapshot.days.get('2026-11-08')?.entries[0]?.id).toBe(entry.id);
    expect(snapshot.running?.id).toBe(running.id);
    expect(snapshot.readOnly).toBe(false);
  });

  test('since limits which day files are read', async () => {
    const t = await createTestVault();
    await seed(t);
    await t.writeJson('entries/2026/11/2026-11-01.json', buildDay('2026-11-01', []));
    await t.writeJson('entries/2026/11/2026-11-08.json', buildDay('2026-11-08', []));
    const snapshot = await t.vault.read({ since: '2026-11-05' });
    expect([...snapshot.days.keys()]).toEqual(['2026-11-08']);
  });

  test('a folder without ttime.json is reported', async () => {
    const t = await createTestVault({ init: false });
    const snapshot = await t.vault.read();
    expect(snapshot.config).toBeNull();
    expect(codes(snapshot.issues)).toEqual(['vault.missing_config']);
  });
});

describe('file problems become issues and the rest still loads', () => {
  test('invalid JSON and schema violations name the file and JSON path', async () => {
    const t = await createTestVault();
    await seed(t);
    await t.writeRaw('entries/2026/11/2026-11-07.json', '{ broken');
    await t.writeJson('projects/globex.json', { ...buildProject({ id: 'globex' }), color: 'blue' });
    await t.writeJson('entries/2026/11/2026-11-08.json', buildDay('2026-11-08', [buildEntry()]));
    const snapshot = await t.vault.read();
    expect(codes(snapshot.issues)).toEqual(['file.invalid_json', 'file.invalid_schema']);
    const schemaIssue = snapshot.issues.find((i) => i.code === 'file.invalid_schema');
    expect(schemaIssue).toMatchObject({
      file: 'projects/globex.json',
      path: ['color'],
      severity: 'error',
    });
    expect(snapshot.days.has('2026-11-08')).toBe(true);
  });

  test('a newer schema makes the snapshot read-only', async () => {
    const t = await createTestVault();
    await t.writeJson('ttime.json', { schema: 2, name: 'Future' });
    const snapshot = await t.vault.read();
    expect(snapshot.readOnly).toBe(true);
    expect(codes(snapshot.issues)).toEqual(['file.newer_schema']);
  });

  test('a record whose id differs from its file name is flagged and skipped', async () => {
    const t = await createTestVault();
    await t.writeJson('clients/acme.json', buildClient({ id: 'globex' }));
    const snapshot = await t.vault.read();
    expect(codes(snapshot.issues)).toEqual(['file.misnamed']);
    expect(snapshot.clients.size).toBe(0);
  });

  test('a broken running.json is reported', async () => {
    const t = await createTestVault();
    await t.writeRaw('running.json', 'null');
    const snapshot = await t.vault.read();
    expect(codes(snapshot.issues)).toEqual(['file.invalid_schema']);
    expect(snapshot.running).toBeNull();
  });
});

describe('stop crash recovery', () => {
  test('the same entry in running.json and a day file means the stop finished: nothing runs', async () => {
    const t = await createTestVault();
    await seed(t);
    const entry = buildEntry();
    const { end, ...running } = entry;
    await t.writeJson('entries/2026/11/2026-11-08.json', buildDay('2026-11-08', [entry]));
    await t.writeJson('running.json', { schema: 1, entry: running });
    const snapshot = await t.vault.read();
    expect(snapshot.running).toBeNull();
    expect(snapshot.issues).toMatchObject([{ code: 'running.already_stopped', severity: 'info' }]);
  });
});
