import { describe, expect, test } from 'bun:test';
import { Temporal } from 'temporal-polyfill';

import { isTTimeError } from './errors';
import {
  addDays,
  compareDates,
  compareTimestamps,
  epochSeconds,
  formatTimestamp,
  formatWallTime,
  isLocalDate,
  isLocalTime,
  isTimestamp,
  localDateOf,
  monthOf,
  secondsBetween,
  toInstant,
  toZoned,
} from './time';

test('timestamps need seconds and a numeric offset, no fractions and no Z', () => {
  expect(isTimestamp('2026-11-08T09:30:00+02:00')).toBe(true);
  expect(isTimestamp('2026-11-08T09:30+02:00')).toBe(false);
  expect(isTimestamp('2026-11-08T09:30:00.5+02:00')).toBe(false);
  expect(isTimestamp('2026-11-08T09:30:00Z')).toBe(false);
  expect(isTimestamp('2026-02-30T09:30:00+02:00')).toBe(false);
});

test('dates and wall-clock times are validated', () => {
  expect(isLocalDate('2026-11-08')).toBe(true);
  expect(isLocalDate('2026-02-30')).toBe(false);
  expect(isLocalDate('20261108')).toBe(false);
  expect(isLocalTime('04:00')).toBe(true);
  expect(isLocalTime('24:00')).toBe(false);
});

test('formatTimestamp truncates to seconds and keeps the offset', () => {
  const time = Temporal.ZonedDateTime.from('2026-11-08T09:30:12.987[Europe/Bucharest]');
  expect(formatTimestamp(time)).toBe('2026-11-08T09:30:12+02:00');
});

test('timestamps compare by instant, not by text', () => {
  expect(compareTimestamps('2026-11-08T10:00:00+02:00', '2026-11-08T09:00:00+00:00')).toBe(-1);
  expect(secondsBetween('2026-11-08T10:00:00+02:00', '2026-11-08T09:00:00+00:00')).toBe(3600);
  expect(epochSeconds('1970-01-01T00:01:00+00:00')).toBe(60);
});

test('the local date is the one written in the timestamp', () => {
  expect(localDateOf('2026-11-08T23:30:00-05:00')).toBe('2026-11-08');
  expect(monthOf('2026-11-30T23:59:59+02:00')).toBe('2026-11');
});

test('malformed timestamps throw input.invalid', () => {
  try {
    toInstant('yesterday');
    expect.unreachable();
  } catch (error) {
    expect(isTTimeError(error, 'input.invalid')).toBe(true);
  }
});

test('toZoned and date arithmetic', () => {
  expect(toZoned('2026-11-08T10:00:00+02:00', 'UTC').hour).toBe(8);
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  expect(compareDates('2026-11-08', '2026-11-07')).toBe(1);
});

describe('formatWallTime', () => {
  test('shows only the clock time for today and adds the date otherwise', () => {
    expect(formatWallTime('2026-11-08T09:05:00+02:00', '2026-11-08')).toBe('09:05');
    expect(formatWallTime('2026-11-07T23:30:00+02:00', '2026-11-08')).toBe('2026-11-07 23:30');
  });
});
