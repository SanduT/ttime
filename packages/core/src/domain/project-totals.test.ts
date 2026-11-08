import { describe, expect, test } from 'bun:test';
import { Temporal } from 'temporal-polyfill';

import { buildEntry, buildRunning } from '../testing/builders';
import { projectTotals } from './project-totals';

const now = Temporal.ZonedDateTime.from('2026-11-08T12:00:00+02:00[Europe/Bucharest]');
const SETTINGS = { weekStartsOn: 'monday', dayStartsAt: '00:00' } as const;
const hour = (date: string, project = 'acme-website') =>
  buildEntry({ project, start: `${date}T09:00:00+02:00`, end: `${date}T10:00:00+02:00` });

describe('projectTotals', () => {
  test('sums this week, this month and all time per project', () => {
    const entries = [
      hour('2026-11-08'),
      hour('2026-11-01'),
      hour('2026-10-15'),
      hour('2026-11-03', 'internal'),
    ];
    const totals = projectTotals({ entries, running: null, now, settings: SETTINGS });
    expect(totals.get('acme-website')).toEqual({ week: 3600, month: 7200, all: 10_800 });
    expect(totals.get('internal')).toEqual({ week: 3600, month: 3600, all: 3600 });
  });

  test('counts the running entry up to now', () => {
    const running = buildRunning({ start: '2026-11-08T11:00:00+02:00' });
    const totals = projectTotals({ entries: [], running, now, settings: SETTINGS });
    expect(totals.get('acme-website')).toEqual({ week: 3600, month: 3600, all: 3600 });
  });
});
