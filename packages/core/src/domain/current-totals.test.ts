import { describe, expect, test } from 'bun:test';
import { Temporal } from 'temporal-polyfill';

import { buildEntry, buildRunning } from '../testing/builders';
import { currentTotals } from './current-totals';

const ZONE = 'Europe/Bucharest';
const at = (time: string) => Temporal.ZonedDateTime.from(`${time}[${ZONE}]`);
const SETTINGS = { weekStartsOn: 'monday', dayStartsAt: '00:00' } as const;

// 2026-11-08 is a Sunday; the Monday-based week starts 2026-11-02.
const entries = [
  buildEntry({ start: '2026-11-08T08:00:00+02:00', end: '2026-11-08T09:00:00+02:00' }),
  buildEntry({
    project: 'internal',
    start: '2026-11-03T09:00:00+02:00',
    end: '2026-11-03T11:00:00+02:00',
  }),
  buildEntry({ start: '2026-11-01T09:00:00+02:00', end: '2026-11-01T10:00:00+02:00' }),
];

describe('currentTotals', () => {
  test('sums today and this week per project, counting the running entry up to now', () => {
    const running = buildRunning({ start: '2026-11-08T11:00:00+02:00' });
    const totals = currentTotals({
      entries,
      running,
      now: at('2026-11-08T11:30:00+02:00'),
      settings: SETTINGS,
    });
    expect(totals.today).toEqual({
      date: '2026-11-08',
      seconds: 5400,
      byProject: [{ project: 'acme-website', seconds: 5400 }],
    });
    expect(totals.week).toEqual({
      start: '2026-11-02',
      seconds: 12_600,
      byProject: [
        { project: 'internal', seconds: 7200 },
        { project: 'acme-website', seconds: 5400 },
      ],
    });
  });

  test('honours the week start setting', () => {
    const totals = currentTotals({
      entries,
      running: null,
      now: at('2026-11-08T11:30:00+02:00'),
      settings: { ...SETTINGS, weekStartsOn: 'sunday' },
    });
    expect(totals.week).toMatchObject({ start: '2026-11-08', seconds: 3600 });
  });

  test('counts time before dayStartsAt toward the previous day', () => {
    const late = buildEntry({
      start: '2026-11-08T01:00:00+02:00',
      end: '2026-11-08T02:00:00+02:00',
    });
    const totals = currentTotals({
      entries: [late],
      running: null,
      now: at('2026-11-08T03:00:00+02:00'),
      settings: { ...SETTINGS, dayStartsAt: '04:00' },
    });
    expect(totals.today).toMatchObject({ date: '2026-11-07', seconds: 3600 });
  });

  test('splits an entry crossing midnight between the days', () => {
    const overnight = buildEntry({
      start: '2026-11-07T23:00:00+02:00',
      end: '2026-11-08T01:00:00+02:00',
    });
    const totals = currentTotals({
      entries: [overnight],
      running: null,
      now: at('2026-11-08T10:00:00+02:00'),
      settings: SETTINGS,
    });
    expect(totals.today.seconds).toBe(3600);
    expect(totals.week.seconds).toBe(7200);
  });
});
