import { Temporal } from '@ttime/core';
import { describe, expect, test } from 'bun:test';

import { parseDate, parseRange, parseTime } from './dates';

const now = Temporal.ZonedDateTime.from('2026-11-08T10:15:00[Europe/Bucharest]');
const snapshot = {
  config: null,
  clients: new Map(),
  projects: new Map(),
  days: new Map(),
  running: null,
  issues: [],
  readOnly: false,
};

describe('date arguments', () => {
  test('relative and ISO dates', () => {
    expect(parseDate('yesterday', '2026-11-08')).toBe('2026-11-07');
    expect(parseDate('2026-10-01', '2026-11-08')).toBe('2026-10-01');
    expect(() => parseDate('last tuesday', '2026-11-08')).toThrow('Use a date');
  });

  test('times: clock, local date-time and ISO with offset', () => {
    expect(parseTime('17:30', now)).toBe('2026-11-08T17:30:00+02:00');
    expect(parseTime('9:05', now, '2026-11-07')).toBe('2026-11-07T09:05:00+02:00');
    expect(parseTime('2026-11-07T14:00', now)).toBe('2026-11-07T14:00:00+02:00');
    expect(parseTime('2026-11-07T14:00:00+01:00', now)).toBe('2026-11-07T14:00:00+01:00');
    expect(() => parseTime('5pm', now)).toThrow('Use a time');
  });

  test('ranges from a period, from/to, or the fallback', () => {
    expect(parseRange({}, now, snapshot, 'this-week')).toEqual({
      from: '2026-11-02',
      to: '2026-11-08',
    });
    expect(parseRange({ period: 'last-month' }, now, snapshot, 'today')).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    });
    expect(parseRange({ from: 'yesterday' }, now, snapshot, 'today')).toEqual({
      from: '2026-11-07',
      to: '2026-11-07',
    });
    expect(() =>
      parseRange({ from: '2026-11-08', to: '2026-11-01' }, now, snapshot, 'today'),
    ).toThrow('ends');
    expect(() => parseRange({ period: 'fortnight' }, now, snapshot, 'today')).toThrow('period');
  });
});
