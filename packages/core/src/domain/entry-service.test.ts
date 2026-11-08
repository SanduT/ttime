import { describe, expect, test } from 'bun:test';

import { buildDay, buildEntry } from '../testing/builders';
import { createDomainTestVault } from '../testing/domain-vault';
import { errorCodeOf } from '../testing/errors';

const DAY = 'entries/2026/11/2026-11-08.json';

const setup = async () => {
  const tv = await createDomainTestVault();
  const day = async (date = '2026-11-08') => (await tv.vault.read()).days.get(date)?.entries ?? [];
  return { ...tv, day };
};

const seeded = async (...entries: ReturnType<typeof buildEntry>[]) => {
  const t = await setup();
  await t.writeJson(DAY, buildDay('2026-11-08', entries));
  return t;
};

describe('create and update', () => {
  test('create adds a finished entry to its day file', async () => {
    const t = await setup();
    const entry = await t.entries.create({
      project: 'acme-website',
      description: ' review ',
      start: '2026-11-07T14:00:00+02:00',
      end: '2026-11-07T16:00:00+02:00',
    });
    expect(entry).toMatchObject({ description: 'review', billable: true, createdBy: 'app' });
    expect((await t.day('2026-11-07')).map((e) => e.id)).toEqual([entry.id]);
  });

  test('create rejects empty ranges, future ends and archived projects', async () => {
    const t = await setup();
    const base = { project: 'acme-website', start: '2026-11-08T08:00:00+02:00' };
    expect(await errorCodeOf(t.entries.create({ ...base, end: base.start }))).toBe(
      'entry.invalid_range',
    );
    expect(await errorCodeOf(t.entries.create({ ...base, end: '2026-11-08T11:00:00+02:00' }))).toBe(
      'entry.invalid_range',
    );
    expect(
      await errorCodeOf(
        t.entries.create({ ...base, project: 'legacy', end: '2026-11-08T09:00:00+02:00' }),
      ),
    ).toBe('project.archived');
  });

  test('update changes fields and keeps unknown keys', async () => {
    const entry = { ...buildEntry(), invoiceLine: 'INV-1' };
    const t = await seeded(entry);
    const updated = await t.entries.update(entry.id, {
      description: 'new',
      tags: ['a', 'a'],
      project: 'internal',
    });
    expect(updated).toMatchObject({
      description: 'new',
      tags: ['a'],
      project: 'internal',
      invoiceLine: 'INV-1',
    });
    expect(updated.updatedAt).toBe('2026-11-08T10:00:00+02:00');
  });
});

describe('day files and lookup', () => {
  test('changing the start date moves the entry to the other day file', async () => {
    const entry = buildEntry();
    const t = await seeded(entry);
    await t.entries.update(entry.id, {
      start: '2026-11-06T09:00:00+02:00',
      end: '2026-11-06T10:00:00+02:00',
    });
    expect(await t.day()).toEqual([]);
    expect(await t.readRaw(DAY)).toContain('"entries": []');
    expect((await t.day('2026-11-06')).map((e) => e.id)).toEqual([entry.id]);
  });

  test('a move that dies after writing the new day file leaves a reported duplicate', async () => {
    const entry = buildEntry();
    const t = await seeded(entry);
    t.fs.failNext('writeAtomic', '2026-11-08.json');
    expect(await errorCodeOf(t.entries.move(entry.id, '2026-11-06T09:00:00+02:00'))).toBe(
      'io.failed',
    );
    expect((await t.vault.read()).issues.map((i) => i.code)).toContain('entry.duplicate_id');
  });

  test('entries are found in any day file, not only near their creation date', async () => {
    const t = await setup();
    const old = buildEntry({
      start: '2026-10-01T09:00:00+02:00',
      end: '2026-10-01T10:00:00+02:00',
    });
    await t.writeJson('entries/2026/10/2026-10-01.json', buildDay('2026-10-01', [old]));
    await t.writeJson('entries/2026/10/2026-10-02.json', buildDay('2026-10-02', []));
    await t.writeJson(DAY, buildDay('2026-11-08', [buildEntry()]));
    expect((await t.entries.update(old.id, { description: 'found' })).description).toBe('found');
  });

  test('unknown IDs are reported', async () => {
    const t = await setup();
    expect(await errorCodeOf(t.entries.update('01JC8Z6YQ8K3N7R2T5V9W1X4Z9', {}))).toBe(
      'entry.not_found',
    );
    expect(await errorCodeOf(t.entries.update('not-an-id', {}))).toBe('entry.not_found');
  });
});

describe('move, split and merge', () => {
  test('move keeps the duration', async () => {
    const entry = buildEntry({
      start: '2026-11-08T08:00:00+02:00',
      end: '2026-11-08T08:45:30+02:00',
    });
    const t = await seeded(entry);
    const moved = await t.entries.move(entry.id, '2026-11-08T06:00:00+02:00');
    expect(moved).toMatchObject({
      start: '2026-11-08T06:00:00+02:00',
      end: '2026-11-08T06:45:30+02:00',
    });
  });

  test('split cuts an entry in two and distributes the notes', async () => {
    const entry = buildEntry({
      notes: [
        { at: '2026-11-08T09:10:00+02:00', text: 'a' },
        { at: '2026-11-08T09:40:00+02:00', text: 'b' },
      ],
    });
    const t = await seeded(entry);
    const [first, second] = await t.entries.split(entry.id, '2026-11-08T09:30:00+02:00');
    expect(first).toMatchObject({
      id: entry.id,
      end: '2026-11-08T09:30:00+02:00',
      notes: [{ text: 'a' }],
    });
    expect(second).toMatchObject({
      start: '2026-11-08T09:30:00+02:00',
      end: entry.end,
      notes: [{ text: 'b' }],
    });
    expect((await t.day()).map((e) => e.id)).toEqual([entry.id, second.id]);
    expect(await errorCodeOf(t.entries.split(entry.id, entry.start))).toBe('entry.invalid_range');
  });

  test('merge joins entries of one project and trashes the rest', async () => {
    const a = buildEntry({
      start: '2026-11-08T08:00:00+02:00',
      end: '2026-11-08T08:30:00+02:00',
      tags: ['x'],
    });
    const b = buildEntry({
      start: '2026-11-08T08:40:00+02:00',
      end: '2026-11-08T09:00:00+02:00',
      tags: ['y'],
    });
    const t = await seeded(a, b);
    const merged = await t.entries.merge([b.id, a.id]);
    expect(merged).toMatchObject({ id: a.id, start: a.start, end: b.end, tags: ['x', 'y'] });
    expect((await t.day()).map((e) => e.id)).toEqual([a.id]);
    expect(await t.readRaw(`.trash/entries/${b.id}.json`)).not.toBeNull();
  });

  test('merge needs two entries of the same project', async () => {
    const a = buildEntry();
    const b = buildEntry({
      project: 'internal',
      start: '2026-11-08T07:00:00+02:00',
      end: '2026-11-08T08:00:00+02:00',
    });
    const t = await seeded(a, b);
    expect(await errorCodeOf(t.entries.merge([a.id, b.id]))).toBe('input.invalid');
    expect(await errorCodeOf(t.entries.merge([a.id, a.id]))).toBe('input.invalid');
  });
});

describe('delete and restore', () => {
  test('delete moves the entry to the trash and restore brings it back', async () => {
    const entry = buildEntry();
    const t = await seeded(entry);
    await t.entries.delete(entry.id);
    expect(await t.day()).toEqual([]);
    const restored = await t.entries.restore(entry.id);
    expect(restored).toEqual(entry);
    expect((await t.day()).map((e) => e.id)).toEqual([entry.id]);
    expect(await t.readRaw(`.trash/entries/${entry.id}.json`)).toBeNull();
  });

  test('restore fails for unknown or still-present entries', async () => {
    const entry = buildEntry();
    const t = await seeded(entry);
    expect(await errorCodeOf(t.entries.restore(entry.id))).toBe('entry.not_found');
    await t.writeJson(`.trash/entries/${entry.id}.json`, {
      schema: 1,
      deletedAt: '2026-11-08T10:00:00+02:00',
      deletedBy: 'cli',
      entry,
    });
    expect(await errorCodeOf(t.entries.restore(entry.id))).toBe('entry.duplicate_id');
  });

  test('a broken day file is never rewritten by an edit', async () => {
    const t = await setup();
    await t.writeRaw(DAY, '{ "schema": 1,');
    expect(
      await errorCodeOf(
        t.entries.create({
          project: 'acme-website',
          start: '2026-11-08T08:00:00+02:00',
          end: '2026-11-08T09:00:00+02:00',
        }),
      ),
    ).toBe('vault.parse_failed');
    expect(await t.readRaw(DAY)).toBe('{ "schema": 1,');
  });
});
