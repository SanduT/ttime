import { describe, expect, test } from 'bun:test';

import { buildEntry, buildProject } from '../testing/builders';
import { parseQuickInput } from './quick-input-parser';
import { filterRecent, recentEntries } from './recent-entries';

const PROJECTS = [
  buildProject(),
  buildProject({ id: 'internal', name: 'Internal', client: undefined }),
];

const entries = [
  buildEntry({ description: 'auth refactor', start: '2026-11-06T09:00:00+02:00' }),
  buildEntry({
    description: 'auth refactor',
    start: '2026-11-08T09:00:00+02:00',
    tags: ['dev'],
    billable: false,
  }),
  buildEntry({
    project: 'internal',
    description: 'inbox zero',
    start: '2026-11-07T09:00:00+02:00',
  }),
  buildEntry({
    project: 'internal',
    description: 'auth refactor',
    start: '2026-11-05T09:00:00+02:00',
  }),
];

describe('recentEntries', () => {
  test('keeps one item per project and description, newest first, from the latest use', () => {
    expect(recentEntries(entries)).toEqual([
      {
        project: 'acme-website',
        description: 'auth refactor',
        tags: ['dev'],
        billable: false,
        lastStart: '2026-11-08T09:00:00+02:00',
      },
      {
        project: 'internal',
        description: 'inbox zero',
        tags: [],
        billable: true,
        lastStart: '2026-11-07T09:00:00+02:00',
      },
      {
        project: 'internal',
        description: 'auth refactor',
        tags: [],
        billable: true,
        lastStart: '2026-11-05T09:00:00+02:00',
      },
    ]);
  });

  test('treats descriptions differing only in case and spacing as the same item', () => {
    const items = recentEntries([
      buildEntry({ description: 'Auth  Refactor', start: '2026-11-08T09:00:00+02:00' }),
      buildEntry({ description: 'auth refactor', start: '2026-11-07T09:00:00+02:00' }),
    ]);
    expect(items.map((item) => item.description)).toEqual(['Auth  Refactor']);
  });

  test('stops at the limit', () => {
    expect(recentEntries(entries, { limit: 1 })).toHaveLength(1);
  });
});

describe('filterRecent', () => {
  const recent = recentEntries(entries);

  test('returns everything for empty input', () => {
    expect(filterRecent(recent, parseQuickInput(''), PROJECTS)).toEqual(recent);
  });

  test('matches every word against the description or the project name', () => {
    const found = filterRecent(recent, parseQuickInput('AUTH inter'), PROJECTS);
    expect(found.map((item) => [item.project, item.description])).toEqual([
      ['internal', 'auth refactor'],
    ]);
  });

  test('narrows by the @project token', () => {
    const found = filterRecent(recent, parseQuickInput('auth @acme'), PROJECTS);
    expect(found.map((item) => item.project)).toEqual(['acme-website']);
  });

  test('finds nothing for an @project that matches no project', () => {
    expect(filterRecent(recent, parseQuickInput('@nope'), PROJECTS)).toEqual([]);
  });
});
