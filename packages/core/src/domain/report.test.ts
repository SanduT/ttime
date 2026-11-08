import { describe, expect, test } from 'bun:test';

import { buildClient, buildEntry, buildProject } from '../testing/builders';
import { dailySummary, type ReportInput, reportRows, reportTotals } from './report';

const projects = new Map([
  ['acme-website', buildProject({ rate: { amount: '60.00', currency: 'EUR' } })],
  ['internal', buildProject({ id: 'internal', name: 'Internal', client: undefined })],
  ['support', buildProject({ id: 'support', name: 'Support' })],
]);
const clients = new Map([
  ['acme', buildClient({ defaultRate: { amount: '40.00', currency: 'EUR' } })],
]);
const NONE = { mode: 'none', minutes: 15, scope: 'entry' } as const;

const entry = (
  date: string,
  start: string,
  end: string,
  extra: Parameters<typeof buildEntry>[0] = {},
) => buildEntry({ start: `${date}T${start}:00+02:00`, end: `${date}T${end}:00+02:00`, ...extra });

const input = (
  entries: ReturnType<typeof buildEntry>[],
  overrides: Partial<ReportInput> = {},
): ReportInput => ({
  entries,
  from: '2026-11-01',
  to: '2026-11-30',
  project: null,
  projects,
  clients,
  timeZone: 'Europe/Bucharest',
  dayStartsAt: '00:00',
  rounding: NONE,
  ...overrides,
});

describe('reportRows', () => {
  test('keeps entries in the period, by date and start, with names, rate and amount', () => {
    const rows = reportRows(
      input([
        entry('2026-11-03', '10:00', '11:30'),
        entry('2026-11-02', '09:00', '10:00'),
        entry('2026-10-31', '09:00', '10:00'),
      ]),
    );
    expect(
      rows.map((r) => [r.date, r.seconds, r.projectName, r.clientName, r.amount?.amount]),
    ).toEqual([
      ['2026-11-02', 3600, 'Acme Website', 'Acme GmbH', '60.00'],
      ['2026-11-03', 5400, 'Acme Website', 'Acme GmbH', '90.00'],
    ]);
  });

  test("splits an entry across midnight and keeps each part's notes", () => {
    const overnight = buildEntry({
      start: '2026-11-02T23:00:00+02:00',
      end: '2026-11-03T01:00:00+02:00',
      notes: [
        { at: '2026-11-02T23:30:00+02:00', text: 'late' },
        { at: '2026-11-03T00:30:00+02:00', text: 'later' },
      ],
    });
    const rows = reportRows(input([overnight]));
    expect(rows.map((r) => [r.date, r.seconds, r.notes.map((n) => n.text)])).toEqual([
      ['2026-11-02', 3600, ['late']],
      ['2026-11-03', 3600, ['later']],
    ]);
  });

  test('filters by project, falls back to the client rate, and prices only billable time', () => {
    const entries = [
      entry('2026-11-02', '09:00', '10:00', { project: 'support' }),
      entry('2026-11-02', '10:00', '11:00', { project: 'support', billable: false }),
      entry('2026-11-02', '11:00', '12:00', { project: 'internal' }),
    ];
    const rows = reportRows(input(entries, { project: 'support' }));
    expect(rows.map((r) => r.amount)).toEqual([{ amount: '40.00', currency: 'EUR' }, null]);
  });

  test('rounds each entry with entry scope', () => {
    const rows = reportRows(
      input([entry('2026-11-02', '09:00', '09:07')], {
        rounding: { mode: 'up', minutes: 15, scope: 'entry' },
      }),
    );
    expect(rows[0]).toMatchObject({ rawSeconds: 420, seconds: 900 });
  });
});

describe('dailySummary', () => {
  const day = [
    entry('2026-11-02', '09:00', '09:07', { description: 'auth' }),
    entry('2026-11-02', '10:00', '10:05', { description: 'auth', tags: ['dev'] }),
    entry('2026-11-02', '11:00', '11:10', { description: 'review', billable: false }),
    entry('2026-11-02', '12:00', '12:03', { description: 'deploy' }),
  ];

  test('merges a project day, billable apart, joining descriptions', () => {
    const summary = dailySummary(reportRows(input(day)), NONE);
    expect(summary.map((r) => [r.billable, r.seconds, r.description, r.tags])).toEqual([
      [true, 900, 'auth; deploy', ['dev']],
      [false, 600, 'review', []],
    ]);
  });

  test('rounds the day total with day scope', () => {
    const rounding = { mode: 'up', minutes: 15, scope: 'day' } as const;
    const summary = dailySummary(reportRows(input(day, { rounding })), rounding);
    expect(summary[0]).toMatchObject({
      rawSeconds: 900,
      seconds: 900,
      amount: { amount: '15.00' },
    });
    expect(summary[1]).toMatchObject({ rawSeconds: 600, seconds: 900, amount: null });
  });

  test('sums rounded entries with entry scope', () => {
    const rounding = { mode: 'up', minutes: 15, scope: 'entry' } as const;
    const summary = dailySummary(reportRows(input(day, { rounding })), rounding);
    expect(summary[0]?.seconds).toBe(2700);
  });
});

describe('reportTotals', () => {
  test('sums seconds, billable seconds and amounts', () => {
    const rows = reportRows(
      input([
        entry('2026-11-02', '09:00', '10:00'),
        entry('2026-11-02', '10:00', '11:00', { billable: false }),
      ]),
    );
    expect(reportTotals(rows)).toEqual({
      seconds: 7200,
      billableSeconds: 3600,
      amounts: [{ amount: '60.00', currency: 'EUR' }],
    });
  });
});
