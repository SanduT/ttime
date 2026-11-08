import { Temporal } from '@ttime/core';
import { describe, expect, test } from 'bun:test';

import { timestampAt } from './clock-input';

const NOW = Temporal.ZonedDateTime.from('2026-11-08T10:00:00+02:00[Europe/Bucharest]');

describe('timestampAt', () => {
  test('puts the time on today in the local offset', () => {
    expect(timestampAt('9:05', NOW)).toBe('2026-11-08T09:05:00+02:00');
    expect(timestampAt(' 08:30 ', NOW)).toBe('2026-11-08T08:30:00+02:00');
  });

  test('is null for anything else', () => {
    expect(timestampAt('25:00', NOW)).toBeNull();
    expect(timestampAt('nine', NOW)).toBeNull();
  });
});
