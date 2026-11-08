import { buildEntry } from '@ttime/core';
import { describe, expect, test } from 'bun:test';

import { periodStart, projectDays } from './project-entries';

const at = (date: string, hour: string, project = 'acme-website') =>
  buildEntry({ project, start: `${date}T${hour}:00:00+02:00`, end: `${date}T${hour}:30:00+02:00` });

describe('project entries', () => {
  test('periodStart gives the first day of the period', () => {
    expect(periodStart('week', '2026-11-08', '2026-11-02')).toBe('2026-11-02');
    expect(periodStart('month', '2026-11-08', '2026-11-02')).toBe('2026-11-01');
    expect(periodStart('all', '2026-11-08', '2026-11-02')).toBeNull();
  });

  test('projectDays groups one project by day, newest first', () => {
    const entries = [
      at('2026-11-07', '10'),
      at('2026-11-08', '11'),
      at('2026-11-08', '09'),
      at('2026-11-08', '12', 'internal'),
      at('2026-10-01', '09'),
    ];
    const days = projectDays(entries, 'acme-website', '2026-11-01');
    expect(
      days.map((day) => [day.date, day.entries.map((e) => e.start.slice(11, 13)), day.seconds]),
    ).toEqual([
      ['2026-11-08', ['09', '11'], 3600],
      ['2026-11-07', ['10'], 1800],
    ]);
  });
});
