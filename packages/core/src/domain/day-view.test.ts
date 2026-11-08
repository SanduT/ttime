import { describe, expect, test } from 'bun:test';
import { Temporal } from 'temporal-polyfill';

import { DEFAULT_SETTINGS } from '../schema/vault-config';
import { buildEntry, buildRunning } from '../testing/builders';
import { dayView } from './day-view';

const at = (time: string) => Temporal.ZonedDateTime.from(`${time}[Europe/Bucharest]`);
// 2026-11-06 is a Friday; working hours 09:00 to 18:00.
const DATE = '2026-11-06';
const entry = (start: string, end: string, project = 'acme-website') =>
  buildEntry({ project, start: `${DATE}T${start}:00+02:00`, end: `${DATE}T${end}:00+02:00` });

const view = (
  entries: ReturnType<typeof buildEntry>[],
  now: string,
  running: ReturnType<typeof buildRunning> | null = null,
) =>
  dayView({
    date: DATE,
    entries,
    running,
    now: at(`${DATE}T${now}:00+02:00`),
    settings: DEFAULT_SETTINGS,
  });

const kinds = (rows: ReturnType<typeof view>['rows']) =>
  rows.map((row) =>
    row.kind === 'gap'
      ? `gap ${row.gap.start.slice(11, 16)}-${row.gap.end.slice(11, 16)}`
      : row.kind,
  );

describe('dayView', () => {
  test('lists entries by start with gaps inside working hours', () => {
    const result = view([entry('13:00', '14:00'), entry('09:00', '12:00')], '20:00');
    expect(kinds(result.rows)).toEqual(['entry', 'gap 12:00-13:00', 'entry', 'gap 14:00-18:00']);
  });

  test('stops gaps at now and skips short ones', () => {
    const result = view([entry('09:03', '10:00')], '11:00');
    expect(kinds(result.rows)).toEqual(['entry', 'gap 10:00-11:00']);
  });

  test('counts the running entry as busy until now', () => {
    const running = buildRunning({ start: `${DATE}T10:00:00+02:00` });
    const result = view([entry('09:00', '10:00')], '12:00', running);
    expect(kinds(result.rows)).toEqual(['entry', 'running']);
    expect(result.totalSeconds).toBe(3 * 3600);
  });

  test('has no gaps on a day off', () => {
    const result = dayView({
      date: '2026-11-07',
      entries: [],
      running: null,
      now: at('2026-11-07T20:00:00+02:00'),
      settings: DEFAULT_SETTINGS,
    });
    expect(result.rows).toEqual([]);
  });

  test('totals per project, most first', () => {
    const result = view([entry('09:00', '10:00', 'internal'), entry('10:00', '12:00')], '20:00');
    expect(result.byProject).toEqual([
      { project: 'acme-website', seconds: 7200 },
      { project: 'internal', seconds: 3600 },
    ]);
  });

  test('leaves out entries that started on another day but counts their time today', () => {
    const overnight = buildEntry({
      start: '2026-11-05T23:00:00+02:00',
      end: `${DATE}T01:00:00+02:00`,
    });
    const result = view([overnight], '08:00');
    expect(result.rows).toEqual([]);
    expect(result.totalSeconds).toBe(3600);
  });
});
