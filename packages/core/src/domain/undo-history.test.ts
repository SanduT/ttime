import { describe, expect, test } from 'bun:test';

import type { Change } from '../schema/changelog';
import { groupBatches, undoState } from './undo-history';

const ULID = (n: number) => `01JC9A${String(n).padStart(20, '0')}`;

const change = (batch: number, overrides: Partial<Change> = {}): Change => ({
  actor: 'app',
  op: 'update',
  kind: 'entry',
  id: 'x',
  at: '2026-11-08T10:00:00+02:00',
  batch: ULID(batch),
  before: null,
  after: null,
  ...overrides,
});

const state = (...changes: Change[]) => {
  const { undo, redo } = undoState(groupBatches(changes), 'app');
  return { undo: undo?.batch ?? null, redo: redo?.batch ?? null };
};

describe('groupBatches', () => {
  test('keeps the lines of one batch together in order', () => {
    const batches = groupBatches([change(1, { id: 'a' }), change(2), change(1, { id: 'b' })]);
    expect(batches.map((b) => b.changes.map((c) => c.id))).toEqual([['a', 'b'], ['x']]);
  });
});

describe('undoState', () => {
  test('undo targets the latest batch of the actor', () => {
    expect(state(change(1), change(2), change(3, { actor: 'cli' }))).toEqual({
      undo: ULID(2),
      redo: null,
    });
  });

  test('an undo moves the batch to redo and exposes the previous one', () => {
    expect(state(change(1), change(2), change(3, { undoes: ULID(2) }))).toEqual({
      undo: ULID(1),
      redo: ULID(3),
    });
  });

  test('a redo (undo of the undo) makes it undoable again', () => {
    expect(
      state(change(1), change(2, { undoes: ULID(1) }), change(3, { undoes: ULID(2) })),
    ).toEqual({ undo: ULID(3), redo: null });
  });

  test('a new change clears redo', () => {
    expect(state(change(1), change(2, { undoes: ULID(1) }), change(3))).toEqual({
      undo: ULID(3),
      redo: null,
    });
  });

  test('undoing an outside batch counts as a normal change', () => {
    expect(state(change(1, { actor: 'cli' }), change(2, { undoes: ULID(1) }))).toEqual({
      undo: ULID(2),
      redo: null,
    });
  });
});
