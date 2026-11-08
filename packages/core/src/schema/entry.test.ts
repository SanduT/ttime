import { describe, expect, test } from 'bun:test';

import {
  type DayFile,
  dayFileSchema,
  type Entry,
  entrySchema,
  runningFileSchema,
  type TrashedEntry,
  trashedEntrySchema,
} from './entry';

const entry: Entry = {
  id: '01JC8Z6YQ8K3N7R2T5V9W1X4Z0',
  project: 'acme-website',
  description: 'auth refactor',
  start: '2026-11-08T09:30:00+02:00',
  end: '2026-11-08T11:15:12+02:00',
  tags: ['backend'],
  billable: true,
  notes: [{ at: '2026-11-08T10:42:00+02:00', text: 'finished login flow' }],
  createdBy: 'app',
  updatedAt: '2026-11-08T11:15:12+02:00',
};

describe('entries', () => {
  test('the ARCHITECTURE example parses', () => {
    expect(entrySchema.parse(entry)).toEqual(entry);
  });

  test('end must be after start', () => {
    const result = entrySchema.safeParse({ ...entry, end: entry.start });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['end']);
  });

  test('end is compared by instant across offsets', () => {
    const shifted = { ...entry, end: '2026-11-08T08:00:00+00:00' };
    expect(entrySchema.safeParse(shifted).success).toBe(true);
  });

  test('unknown keys are preserved at every level', () => {
    const custom = {
      ...entry,
      invoice: 'INV-7',
      notes: [{ at: '2026-11-08T10:42:00+02:00', text: 'x', mood: 'good' }],
    };
    expect(entrySchema.parse(custom)).toEqual(custom);
  });

  test('tags and notes default to empty lists', () => {
    const { tags, notes, ...bare } = entry;
    const parsed = entrySchema.parse(bare);
    expect(parsed.tags).toEqual([]);
    expect(parsed.notes).toEqual([]);
  });

  test('bad IDs, projects and timestamps are rejected', () => {
    expect(entrySchema.safeParse({ ...entry, id: 'abc' }).success).toBe(false);
    expect(entrySchema.safeParse({ ...entry, project: 'Acme Website' }).success).toBe(false);
    expect(entrySchema.safeParse({ ...entry, start: '2026-11-08 09:30' }).success).toBe(false);
  });
});

describe('vault files', () => {
  test('day files need schema 1 and a date', () => {
    const day: DayFile = { schema: 1, date: '2026-11-08', entries: [entry] };
    expect(dayFileSchema.parse(day)).toEqual(day);
    expect(dayFileSchema.safeParse({ ...day, schema: 2 }).success).toBe(false);
  });

  test('running.json holds an entry without end, or null', () => {
    const { end, ...running } = entry;
    expect(runningFileSchema.parse({ schema: 1, entry: running }).entry?.id).toBe(entry.id);
    expect(runningFileSchema.parse({ schema: 1, entry: null }).entry).toBeNull();
  });

  test('trashed entries record who deleted them and when', () => {
    const trashed: TrashedEntry = { schema: 1, deletedAt: entry.end, deletedBy: 'mcp', entry };
    expect(trashedEntrySchema.parse(trashed)).toEqual(trashed);
  });
});
