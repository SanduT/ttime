import { describe, expect, test } from 'bun:test';

import { createTestVault } from '../testing/test-vault';
import { readChangelog } from './changelog';
import { vaultPaths } from './paths';

const line = (batch: string, at: string) =>
  JSON.stringify({
    actor: 'app',
    op: 'create',
    kind: 'entry',
    id: 'x',
    at,
    batch,
    before: null,
    after: null,
  });

const B1 = '01JC9A00000000000000000001';
const B2 = '01JC9A00000000000000000002';

describe('readChangelog', () => {
  test('reads months oldest first and skips broken lines', async () => {
    const tv = await createTestVault();
    await tv.writeRaw('changelog/2026-10.jsonl', `${line(B1, '2026-10-30T10:00:00+02:00')}\n`);
    await tv.writeRaw(
      'changelog/2026-11.jsonl',
      `{oops\n${line(B2, '2026-11-08T10:00:00+02:00')}\n`,
    );
    const changes = await readChangelog(tv.fs, vaultPaths(tv.root));
    expect(changes.map((c) => c.batch)).toEqual([B1, B2]);
  });

  test('limits to the newest months', async () => {
    const tv = await createTestVault();
    await tv.writeRaw('changelog/2026-10.jsonl', `${line(B1, '2026-10-30T10:00:00+02:00')}\n`);
    await tv.writeRaw('changelog/2026-11.jsonl', `${line(B2, '2026-11-08T10:00:00+02:00')}\n`);
    const changes = await readChangelog(tv.fs, vaultPaths(tv.root), 1);
    expect(changes.map((c) => c.batch)).toEqual([B2]);
  });
});
