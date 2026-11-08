import { describe, expect, test } from 'bun:test';

import { commitOf, type Drag, snap, spanOf, timestampAt, weekMinuteOf } from './drag';

const ZONE = 'Europe/Bucharest';
const WEEK = '2026-11-02';
const DAY = 1440;

describe('spanOf', () => {
  test('create spans from the anchor to the pointer, either way, snapped', () => {
    const drag: Drag = { kind: 'create', anchor: 541 };
    expect(spanOf(drag, 602, 5)).toEqual({ start: 540, end: 600 });
    expect(spanOf(drag, 480, 5)).toEqual({ start: 480, end: 540 });
  });

  test('move keeps the duration and follows the pointer across days', () => {
    const drag: Drag = { kind: 'move', id: 'a', start: 540, end: 600, grab: 560, duplicate: false };
    expect(spanOf(drag, DAY + 563, 5)).toEqual({ start: DAY + 545, end: DAY + 605 });
    expect(spanOf(drag, 563, 1)).toEqual({ start: 543, end: 603 });
  });

  test('resize never makes a block shorter than one step', () => {
    const start: Drag = { kind: 'resize', id: 'a', edge: 'start', start: 540, end: 600 };
    const end: Drag = { kind: 'resize', id: 'a', edge: 'end', start: 540, end: 600 };
    expect(spanOf(start, 700, 5)).toEqual({ start: 595, end: 600 });
    expect(spanOf(end, 612, 5)).toEqual({ start: 540, end: 610 });
    expect(spanOf(end, 100, 5)).toEqual({ start: 540, end: 545 });
  });

  test('snap rounds to the nearest step', () => {
    expect(snap(542, 5)).toBe(540);
    expect(snap(543, 5)).toBe(545);
  });
});

describe('week minutes and timestamps', () => {
  test('convert both ways, including the next week', () => {
    expect(weekMinuteOf('2026-11-03T09:30:00+02:00', WEEK, ZONE)).toBe(DAY + 570);
    expect(weekMinuteOf('2026-11-01T23:00:00+02:00', WEEK, ZONE)).toBe(-60);
    expect(timestampAt(DAY + 570, WEEK, ZONE)).toBe('2026-11-03T09:30:00+02:00');
    expect(timestampAt(7 * DAY, WEEK, ZONE)).toBe('2026-11-09T00:00:00+02:00');
  });
});

describe('commitOf', () => {
  test('turns each gesture into one core call', () => {
    expect(commitOf({ kind: 'create', anchor: 540 }, { start: 540, end: 600 }, WEEK, ZONE)).toEqual(
      {
        kind: 'create',
        start: '2026-11-02T09:00:00+02:00',
        end: '2026-11-02T10:00:00+02:00',
      },
    );
    const move: Drag = { kind: 'move', id: 'a', start: 540, end: 600, grab: 550, duplicate: false };
    expect(commitOf(move, { start: DAY + 540, end: DAY + 600 }, WEEK, ZONE)).toEqual({
      kind: 'move',
      id: 'a',
      start: '2026-11-03T09:00:00+02:00',
    });
    expect(
      commitOf({ ...move, duplicate: true }, { start: 540, end: 600 }, WEEK, ZONE),
    ).toMatchObject({
      kind: 'duplicate',
      end: '2026-11-02T10:00:00+02:00',
    });
    const resize: Drag = { kind: 'resize', id: 'a', edge: 'end', start: 540, end: 600 };
    expect(commitOf(resize, { start: 540, end: 630 }, WEEK, ZONE)).toEqual({
      kind: 'resize',
      id: 'a',
      patch: { end: '2026-11-02T10:30:00+02:00' },
    });
  });

  test('returns null when nothing changed', () => {
    expect(
      commitOf({ kind: 'create', anchor: 540 }, { start: 540, end: 540 }, WEEK, ZONE),
    ).toBeNull();
    const move: Drag = { kind: 'move', id: 'a', start: 540, end: 600, grab: 550, duplicate: false };
    expect(commitOf(move, { start: 540, end: 600 }, WEEK, ZONE)).toBeNull();
    const resize: Drag = { kind: 'resize', id: 'a', edge: 'start', start: 540, end: 600 };
    expect(commitOf(resize, { start: 540, end: 600 }, WEEK, ZONE)).toBeNull();
  });
});
