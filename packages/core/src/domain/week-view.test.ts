import { describe, expect, test } from 'bun:test';
import { Temporal } from 'temporal-polyfill';

import { buildEntry, buildRunning } from '../testing/builders';
import { layoutLanes } from './week-lanes';
import { weekView, type WeekViewInput } from './week-view';

const NOW = Temporal.ZonedDateTime.from('2026-11-04T12:30:00[Europe/Bucharest]');
const HOURS = { days: ['mon', 'tue', 'wed', 'thu', 'fri'], start: '09:00', end: '18:00' } as const;

const at = (date: string, time: string) => `${date}T${time}:00+02:00`;
const entry = (date: string, from: string, to: string, id: string) =>
  buildEntry({ id, start: at(date, from), end: at(date, to) });

const view = (overrides: Partial<WeekViewInput>) =>
  weekView({
    start: '2026-11-02',
    entries: [],
    running: null,
    now: NOW,
    workingHours: HOURS,
    ...overrides,
  });

describe('weekView', () => {
  test('places entries in their day as minutes, with totals and working hours', () => {
    const week = view({ entries: [entry('2026-11-03', '09:30', '11:00', 'a')] });
    expect(week.days.map((day) => day.date)).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
    ]);
    expect(week.days[1]?.blocks[0]).toMatchObject({
      startMinute: 570,
      endMinute: 660,
      lane: 0,
      lanes: 1,
      overlaps: false,
    });
    expect(week.days[1]?.seconds).toBe(5400);
    expect(week.seconds).toBe(5400);
    expect(week.days[0]?.working).toEqual({ startMinute: 540, endMinute: 1080 });
    expect(week.days[5]?.working).toBeNull();
    expect(week.days[6]?.dayOfWeek).toBe(7);
    expect(week.now).toEqual({ date: '2026-11-04', minute: 750 });
  });

  test('splits an entry across midnight into two flagged blocks', () => {
    const late = buildEntry({
      id: 'n',
      start: at('2026-11-02', '23:00'),
      end: at('2026-11-03', '01:30'),
    });
    const week = view({ entries: [late] });
    expect(week.days[0]?.blocks[0]).toMatchObject({
      startMinute: 1380,
      endMinute: 1440,
      startsBefore: false,
      endsAfter: true,
    });
    expect(week.days[1]?.blocks[0]).toMatchObject({
      startMinute: 0,
      endMinute: 90,
      startsBefore: true,
      endsAfter: false,
    });
  });

  test('lays overlapping entries side by side and flags them', () => {
    const week = view({
      entries: [
        entry('2026-11-02', '09:00', '10:00', 'a'),
        entry('2026-11-02', '09:30', '10:30', 'b'),
        entry('2026-11-02', '11:00', '12:00', 'c'),
      ],
    });
    expect(week.days[0]?.blocks.map((b) => [b.entry.id, b.lane, b.lanes, b.overlaps])).toEqual([
      ['a', 0, 2, true],
      ['b', 1, 2, true],
      ['c', 0, 1, false],
    ]);
  });

  test('shows the running entry up to now, and nothing for weeks without today', () => {
    const week = view({ running: buildRunning({ id: 'r', start: at('2026-11-04', '11:00') }) });
    expect(week.days[2]?.blocks[0]).toMatchObject({
      running: true,
      startMinute: 660,
      endMinute: 750,
    });
    expect(view({ start: '2026-11-09' }).now).toBeNull();
  });
});

describe('layoutLanes', () => {
  test('reuses a freed column inside a chain of overlaps', () => {
    const lanes = layoutLanes([
      { startMinute: 0, endMinute: 60 },
      { startMinute: 30, endMinute: 120 },
      { startMinute: 60, endMinute: 90 },
    ]);
    expect(lanes.map((l) => [l.lane, l.lanes])).toEqual([
      [0, 2],
      [1, 2],
      [0, 2],
    ]);
  });
});
