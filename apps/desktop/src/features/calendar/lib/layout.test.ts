import { describe, expect, test } from 'bun:test';

import { dayPieces, weekTitle } from './layout';

describe('calendar layout', () => {
  test('weekTitle names both ends', () => {
    expect(weekTitle('2026-11-02', '2026-11-08')).toBe('Nov 2 – Nov 8, 2026');
  });

  test('dayPieces splits a span at midnight and drops what is outside the week', () => {
    expect(dayPieces({ start: 1380, end: 1530 })).toEqual([
      { day: 0, start: 1380, end: 1440 },
      { day: 1, start: 0, end: 90 },
    ]);
    expect(dayPieces({ start: -60, end: 30 })).toEqual([{ day: 0, start: 0, end: 30 }]);
  });
});
