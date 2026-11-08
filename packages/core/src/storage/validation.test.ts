import { describe, expect, test } from 'bun:test';
import { Temporal } from 'temporal-polyfill';

import { buildClient, buildDay, buildEntry, buildProject, buildRunning } from '../testing/builders';
import { type LoadedDay, validateVault } from './validation';

const now = Temporal.ZonedDateTime.from('2026-11-08T12:00:00[Europe/Bucharest]');
const projects = new Map([['acme-website', buildProject()]]);
const clients = new Map([['acme', buildClient()]]);

const day = (date: string, entries: ReturnType<typeof buildEntry>[]): LoadedDay => ({
  date,
  file: `entries/${date.slice(0, 4)}/${date.slice(5, 7)}/${date}.json`,
  day: buildDay(date, entries),
});

const validate = (days: LoadedDay[]) =>
  validateVault({ days, projects, clients, running: null, runningFile: 'running.json', now });

describe('entry checks', () => {
  test('an unknown project is a warning and the entry still counts', () => {
    const issues = validate([day('2026-11-08', [buildEntry({ project: 'ghost' })])]);
    expect(issues).toMatchObject([
      { code: 'entry.unknown_project', severity: 'warning', path: ['entries', 0, 'project'] },
    ]);
  });

  test('a start more than a minute in the future is flagged', () => {
    const soon = buildEntry({
      start: '2026-11-08T12:01:00+02:00',
      end: '2026-11-08T13:00:00+02:00',
    });
    const later = buildEntry({
      start: '2026-11-08T12:01:01+02:00',
      end: '2026-11-08T13:00:00+02:00',
    });
    const issues = validate([day('2026-11-08', [soon, later])]);
    expect(issues.filter((i) => i.code === 'entry.future_start')).toHaveLength(1);
  });

  test('an entry in the wrong day file is flagged as misplaced', () => {
    const issues = validate([day('2026-11-07', [buildEntry()])]);
    expect(issues).toMatchObject([
      { code: 'entry.misplaced', file: 'entries/2026/11/2026-11-07.json' },
    ]);
  });

  test('a day file whose date differs from its name is flagged', () => {
    const loaded = { ...day('2026-11-08', []), day: buildDay('2026-11-09', []) };
    expect(validate([loaded])).toMatchObject([{ code: 'file.misnamed' }]);
  });
});

describe('cross-file checks', () => {
  test('entry IDs must be unique across the vault', () => {
    const entry = buildEntry();
    const copy = { ...entry, start: '2026-11-07T09:00:00+02:00', end: '2026-11-07T10:00:00+02:00' };
    const issues = validate([day('2026-11-07', [copy]), day('2026-11-08', [entry])]);
    expect(issues).toMatchObject([{ code: 'entry.duplicate_id', severity: 'error' }]);
  });

  test('overlaps are warnings, including across midnight', () => {
    const lateNight = buildEntry({
      start: '2026-11-07T23:00:00+02:00',
      end: '2026-11-08T01:00:00+02:00',
    });
    const early = buildEntry({
      start: '2026-11-08T00:30:00+02:00',
      end: '2026-11-08T00:45:00+02:00',
    });
    const after = buildEntry({
      start: '2026-11-08T00:50:00+02:00',
      end: '2026-11-08T02:00:00+02:00',
    });
    const issues = validate([day('2026-11-07', [lateNight]), day('2026-11-08', [early, after])]);
    expect(issues.map((i) => i.code)).toEqual(['entry.overlap', 'entry.overlap']);
  });

  test('back-to-back entries do not overlap', () => {
    const first = buildEntry({ end: '2026-11-08T10:00:00+02:00' });
    const second = buildEntry({
      start: '2026-11-08T10:00:00+02:00',
      end: '2026-11-08T11:00:00+02:00',
    });
    expect(validate([day('2026-11-08', [first, second])])).toEqual([]);
  });

  test('projects pointing at an unknown client and a running entry on an unknown project', () => {
    const orphan = buildProject({ id: 'orphan', client: 'nobody' });
    const issues = validateVault({
      days: [],
      projects: new Map([...projects, ['orphan', orphan]]),
      clients,
      running: buildRunning({ project: 'ghost' }),
      runningFile: 'running.json',
      now,
    });
    expect(issues.map((i) => i.code)).toEqual(['project.unknown_client', 'entry.unknown_project']);
  });
});
