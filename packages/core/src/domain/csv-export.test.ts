import { describe, expect, test } from 'bun:test';

import { buildEntry, buildProject } from '../testing/builders';
import { buildExport, exportFileName, toCsv } from './csv-export';
import { reportRows } from './report';

const projects = new Map([
  ['acme-website', buildProject({ rate: { amount: '60.00', currency: 'EUR' } })],
]);
const COMMA = { delimiter: ',', decimalSeparator: '.', bom: false } as const;
const NONE = { mode: 'none', minutes: 15, scope: 'entry' } as const;

const input = (entries: ReturnType<typeof buildEntry>[]) => ({
  entries,
  from: '2026-11-01',
  to: '2026-11-30',
  project: null,
  projects,
  clients: new Map(),
  timeZone: 'Europe/Bucharest',
  dayStartsAt: '00:00',
  rounding: NONE,
});

const ENTRY = buildEntry({
  start: '2026-11-02T09:00:00+02:00',
  end: '2026-11-02T10:30:00+02:00',
  description: 'Fix "login", then deploy',
  tags: ['dev', 'ops'],
  notes: [
    { at: '2026-11-02T09:10:00+02:00', text: 'started' },
    { at: '2026-11-02T10:05:00+02:00', text: 'done' },
  ],
});

describe('toCsv', () => {
  test('writes the detailed columns with RFC 4180 quoting and CRLF', () => {
    const csv = toCsv(reportRows(input([ENTRY])), 'detailed', COMMA);
    expect(csv.split('\r\n')).toEqual([
      'date,start,end,duration_decimal,duration_hhmm,project,client,description,notes,tags,billable,rate,amount,currency',
      '2026-11-02,09:00,10:30,1.50,1:30,Acme Website,,"Fix ""login"", then deploy",09:10 started | 10:05 done,"dev, ops",yes,60.00,90.00,EUR',
      '',
    ]);
  });

  test('uses semicolons, decimal commas and a BOM when asked', () => {
    const csv = toCsv(reportRows(input([ENTRY])), 'detailed', {
      delimiter: ';',
      decimalSeparator: ',',
      bom: true,
    });
    expect(csv.startsWith('﻿date;start;end')).toBe(true);
    expect(csv).toContain(';1,50;1:30;');
    expect(csv).toContain(';60,00;90,00;EUR');
    expect(csv).toContain(';dev, ops;');
  });

  test('daily rows have no start and end columns', () => {
    const csv = toCsv(reportRows(input([ENTRY])), 'daily', COMMA);
    expect(csv.split('\r\n')[0]).toBe(
      'date,duration_decimal,duration_hhmm,project,client,description,notes,tags,billable,rate,amount,currency',
    );
  });

  test('leaves rate and amount empty without a rate', () => {
    const plain = new Map([['acme-website', buildProject()]]);
    const csv = toCsv(reportRows({ ...input([ENTRY]), projects: plain }), 'detailed', COMMA);
    expect(csv.split('\r\n')[1]?.endsWith(',yes,,,')).toBe(true);
  });
});

describe('buildExport', () => {
  test('returns the text, the row count and totals for the mode', () => {
    const second = buildEntry({
      start: '2026-11-02T11:00:00+02:00',
      end: '2026-11-02T11:30:00+02:00',
    });
    const detailed = buildExport(input([ENTRY, second]), 'detailed', COMMA);
    const daily = buildExport(input([ENTRY, second]), 'daily', COMMA);
    expect(detailed.rows).toBe(2);
    expect(daily.rows).toBe(1);
    expect(daily.totals).toMatchObject({
      seconds: 7200,
      amounts: [{ amount: '120.00', currency: 'EUR' }],
    });
  });
});

describe('exportFileName', () => {
  test('names the project, period and mode', () => {
    expect(exportFileName('acme-website', '2026-11-01', '2026-11-30', 'daily')).toBe(
      'acme-website_2026-11-01_2026-11-30_daily.csv',
    );
    expect(exportFileName(null, '2026-11-01', '2026-11-30', 'detailed')).toBe(
      'all-projects_2026-11-01_2026-11-30_detailed.csv',
    );
  });
});
