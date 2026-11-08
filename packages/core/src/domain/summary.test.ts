import { describe, expect, test } from 'bun:test';

import { buildEntry, buildProject } from '../testing/builders';
import type { ReportInput } from './report';
import { summarize } from './summary';

const projects = new Map([
  ['acme-website', buildProject({ rate: { amount: '60.00', currency: 'EUR' } })],
  ['internal', buildProject({ id: 'internal', name: 'Internal', billable: false })],
]);

const at = (date: string, time: string) => `${date}T${time}:00+02:00`;

const input: ReportInput = {
  entries: [
    buildEntry({
      id: '1',
      description: 'Auth',
      tags: ['review', 'dev'],
      start: at('2026-11-02', '09:00'),
      end: at('2026-11-02', '10:00'),
    }),
    buildEntry({
      id: '2',
      description: 'Auth',
      start: at('2026-11-03', '09:00'),
      end: at('2026-11-03', '09:30'),
    }),
    buildEntry({
      id: '3',
      project: 'internal',
      billable: false,
      description: '',
      start: at('2026-11-03', '11:00'),
      end: at('2026-11-03', '13:00'),
    }),
  ],
  from: '2026-11-02',
  to: '2026-11-08',
  project: null,
  projects,
  clients: new Map(),
  timeZone: 'Europe/Bucharest',
  dayStartsAt: '00:00',
  rounding: { mode: 'none', minutes: 15, scope: 'entry' },
};

const brief = (groupBy: Parameters<typeof summarize>[1]) =>
  summarize(input, groupBy).groups.map((g) => [g.label, g.seconds]);

describe('summarize', () => {
  test('groups by project, most time first, with totals and amounts', () => {
    const summary = summarize(input, 'project');
    expect(summary.totals).toMatchObject({ seconds: 12_600, billableSeconds: 5400 });
    expect(brief('project')).toEqual([
      ['Internal', 7200],
      ['Acme Website', 5400],
    ]);
    expect(summary.groups[1]?.amounts).toEqual([{ amount: '90.00', currency: 'EUR' }]);
  });

  test('groups by day in date order', () => {
    expect(brief('day')).toEqual([
      ['2026-11-02', 3600],
      ['2026-11-03', 9000],
    ]);
  });

  test('groups by tag (an entry counts in each tag) and by description', () => {
    expect(brief('tag')).toEqual([
      ['(no tag)', 9000],
      ['#dev', 3600],
      ['#review', 3600],
    ]);
    expect(brief('description')).toEqual([
      ['(no description)', 7200],
      ['Auth', 5400],
    ]);
  });
});
