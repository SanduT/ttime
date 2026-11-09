import { describe, expect, test } from 'bun:test';

import { gapTimes } from './gap-draft';

const gap = (start: string, end: string) => ({
  start: `2026-11-09T${start}+02:00`,
  end: `2026-11-09T${end}+02:00`,
  seconds: 0,
});

describe('gapTimes', () => {
  test('rounds a mid-minute start up and the end down', () => {
    expect(gapTimes(gap('12:49:28', '15:24:38'))).toEqual({ start: '12:50', end: '15:24' });
  });

  test('keeps whole-minute times', () => {
    expect(gapTimes(gap('09:00:00', '11:49:00'))).toEqual({ start: '09:00', end: '11:49' });
  });
});
