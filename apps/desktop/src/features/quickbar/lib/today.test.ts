import { buildEntry, buildRunning } from '@ttime/core';
import { describe, expect, test } from 'bun:test';

import { buildToday } from './today';

const NOW = '2026-11-08T12:00:00+02:00';

describe('buildToday', () => {
  const morning = buildEntry({
    start: '2026-11-08T09:00:00+02:00',
    end: '2026-11-08T10:00:00+02:00',
  });
  const early = buildEntry({
    start: '2026-11-08T08:00:00+02:00',
    end: '2026-11-08T08:30:00+02:00',
  });
  const days = new Map([['2026-11-08', { entries: [morning, early] }]]);

  test('lists today in start order with the running entry timed to now', () => {
    const running = buildRunning({ start: '2026-11-08T11:00:00+02:00' });
    const today = buildToday(days, running, '2026-11-08', NOW);
    expect(
      today.rows.map((row) => [row.start.slice(11, 16), row.end === null, row.seconds]),
    ).toEqual([
      ['08:00', false, 1800],
      ['09:00', false, 3600],
      ['11:00', true, 3600],
    ]);
    expect(today.totalSeconds).toBe(9000);
  });

  test('leaves out a running entry that started on another day', () => {
    const running = buildRunning({ start: '2026-11-07T23:00:00+02:00' });
    expect(buildToday(days, running, '2026-11-08', NOW).rows).toHaveLength(2);
  });

  test('is empty for a day without a file', () => {
    expect(buildToday(new Map(), null, '2026-11-08', NOW)).toEqual({ rows: [], totalSeconds: 0 });
  });
});
