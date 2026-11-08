import { describe, expect, test } from 'bun:test';

import { formatElapsed } from './duration';

describe('formatElapsed', () => {
  test('shows hours and minutes by default', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(59)).toBe('0:00');
    expect(formatElapsed(3 * 3600 + 7 * 60 + 5)).toBe('3:07');
  });

  test('adds seconds on request', () => {
    expect(formatElapsed(65, { seconds: true })).toBe('0:01:05');
    expect(formatElapsed(36_000, { seconds: true })).toBe('10:00:00');
  });

  test('treats negative and fractional values as whole non-negative seconds', () => {
    expect(formatElapsed(-30)).toBe('0:00');
    expect(formatElapsed(61.9, { seconds: true })).toBe('0:01:01');
  });
});
