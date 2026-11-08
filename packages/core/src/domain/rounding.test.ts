import { describe, expect, test } from 'bun:test';

import { roundSeconds } from './rounding';

const MIN = 60;

describe('roundSeconds', () => {
  test('none keeps the raw seconds', () => {
    expect(roundSeconds(7 * MIN + 13, { mode: 'none', minutes: 15 })).toBe(7 * MIN + 13);
  });

  test('up, down and nearest use the interval', () => {
    expect(roundSeconds(7 * MIN, { mode: 'up', minutes: 15 })).toBe(15 * MIN);
    expect(roundSeconds(14 * MIN, { mode: 'down', minutes: 15 })).toBe(0);
    expect(roundSeconds(7 * MIN, { mode: 'nearest', minutes: 15 })).toBe(0);
    expect(roundSeconds(7 * MIN + 30, { mode: 'nearest', minutes: 15 })).toBe(15 * MIN);
    expect(roundSeconds(31 * MIN, { mode: 'nearest', minutes: 6 })).toBe(30 * MIN);
  });

  test('exact multiples stay', () => {
    expect(roundSeconds(30 * MIN, { mode: 'up', minutes: 15 })).toBe(30 * MIN);
  });
});
