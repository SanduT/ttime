import { describe, expect, test } from 'bun:test';

import { splitByDay } from './split-by-day';

const ZONE = 'Europe/Bucharest';
const midnight = { timeZone: ZONE, dayStartsAt: '00:00' };

describe('splitByDay', () => {
  test('an entry inside one day is one segment', () => {
    expect(splitByDay('2026-11-08T09:00:00+02:00', '2026-11-08T10:30:00+02:00', midnight)).toEqual([
      {
        date: '2026-11-08',
        start: '2026-11-08T09:00:00+02:00',
        end: '2026-11-08T10:30:00+02:00',
        seconds: 5400,
      },
    ]);
  });

  test('an entry crossing midnight splits at midnight', () => {
    const segments = splitByDay('2026-11-07T22:30:00+02:00', '2026-11-08T01:15:00+02:00', midnight);
    expect(segments.map((s) => [s.date, s.seconds])).toEqual([
      ['2026-11-07', 5400],
      ['2026-11-08', 4500],
    ]);
    expect(segments[0]?.end).toBe('2026-11-08T00:00:00+02:00');
  });

  test('with dayStartsAt 04:00, late-night work counts toward the previous day', () => {
    const options = { timeZone: ZONE, dayStartsAt: '04:00' };
    const segments = splitByDay('2026-11-07T22:30:00+02:00', '2026-11-08T05:00:00+02:00', options);
    expect(segments.map((s) => [s.date, s.seconds])).toEqual([
      ['2026-11-07', 19_800],
      ['2026-11-08', 3600],
    ]);
    const early = splitByDay('2026-11-08T01:00:00+02:00', '2026-11-08T02:00:00+02:00', options);
    expect(early.map((s) => s.date)).toEqual(['2026-11-07']);
  });

  test('a multi-day entry yields one segment per day', () => {
    const segments = splitByDay('2026-11-06T12:00:00+02:00', '2026-11-08T12:00:00+02:00', midnight);
    expect(segments.map((s) => [s.date, s.seconds])).toEqual([
      ['2026-11-06', 43_200],
      ['2026-11-07', 86_400],
      ['2026-11-08', 43_200],
    ]);
  });

  test('the spring-forward day has 23 real hours', () => {
    const segments = splitByDay('2026-03-29T00:00:00+02:00', '2026-03-30T00:00:00+03:00', midnight);
    expect(segments).toHaveLength(1);
    expect(segments[0]?.seconds).toBe(23 * 3600);
  });

  test('the fall-back day has 25 real hours and offsets change mid-entry', () => {
    const segments = splitByDay('2026-10-24T23:00:00+03:00', '2026-10-26T01:00:00+02:00', midnight);
    expect(segments.map((s) => [s.date, s.seconds])).toEqual([
      ['2026-10-24', 3600],
      ['2026-10-25', 25 * 3600],
      ['2026-10-26', 3600],
    ]);
  });

  test('timestamps written in another offset are shown in the report zone', () => {
    const segments = splitByDay('2026-11-08T21:30:00-05:00', '2026-11-08T23:30:00-05:00', midnight);
    expect(segments.map((s) => s.date)).toEqual(['2026-11-09']);
  });

  test('an invalid dayStartsAt is rejected', () => {
    expect(() =>
      splitByDay('2026-11-08T09:00:00+02:00', '2026-11-08T10:00:00+02:00', {
        timeZone: ZONE,
        dayStartsAt: '4',
      }),
    ).toThrow('Invalid dayStartsAt');
  });
});
