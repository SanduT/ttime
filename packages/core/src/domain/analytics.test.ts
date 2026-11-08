import { describe, expect, test } from 'bun:test';

import { buildEntry, buildProject } from '../testing/builders';
import { analytics } from './analytics';
import { buildExport } from './csv-export';
import type { ReportInput } from './report';

const projects = new Map([
  ['acme-website', buildProject({ rate: { amount: '60.00', currency: 'EUR' } })],
  [
    'internal',
    buildProject({ id: 'internal', name: 'Internal', color: '#111111', billable: false }),
  ],
]);

const entry = (
  date: string,
  start: string,
  end: string,
  project = 'acme-website',
  billable = true,
) =>
  buildEntry({
    project,
    billable,
    start: `${date}T${start}:00+02:00`,
    end: `${date}T${end}:00+02:00`,
  });

const ENTRIES = [
  entry('2026-11-02', '09:00', '09:07'),
  entry('2026-11-02', '10:00', '11:00'),
  entry('2026-11-03', '09:00', '09:20', 'internal', false),
];

const input = (overrides: Partial<ReportInput> = {}): ReportInput => ({
  entries: ENTRIES,
  from: '2026-11-02',
  to: '2026-11-04',
  project: null,
  projects,
  clients: new Map(),
  timeZone: 'Europe/Bucharest',
  dayStartsAt: '00:00',
  rounding: { mode: 'none', minutes: 15, scope: 'entry' },
  ...overrides,
});

describe('analytics', () => {
  test('totals, project shares by size, and every day with its stack', () => {
    const result = analytics(input());
    expect(result.totals).toMatchObject({ seconds: 5220, billableSeconds: 4020 });
    expect(
      result.projects.map((p) => [p.project, p.seconds, Math.round(p.share * 100), p.amounts]),
    ).toEqual([
      ['acme-website', 4020, 77, [{ amount: '67.00', currency: 'EUR' }]],
      ['internal', 1200, 23, []],
    ]);
    expect(result.days.map((d) => [d.date, d.seconds, d.byProject.length])).toEqual([
      ['2026-11-02', 4020, 1],
      ['2026-11-03', 1200, 1],
      ['2026-11-04', 0, 0],
    ]);
    expect(result.rows).toHaveLength(3);
  });

  test('rounded totals equal the CSV export with the same rounding', () => {
    for (const scope of ['entry', 'day'] as const) {
      const rounding = { mode: 'up', minutes: 15, scope } as const;
      const csv = buildExport(input({ rounding }), 'daily', {
        delimiter: ',',
        decimalSeparator: '.',
        bom: false,
      });
      expect(analytics(input({ rounding })).totals).toEqual(csv.totals);
    }
  });

  test('an empty period has zero shares', () => {
    const result = analytics(input({ entries: [] }));
    expect(result.projects).toEqual([]);
    expect(result.totals.seconds).toBe(0);
  });
});
