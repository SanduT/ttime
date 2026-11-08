import { buildEntry, buildProject, type QuickContext, recentEntries } from '@ttime/core';
import { describe, expect, test } from 'bun:test';

import { buildItems } from './quick-items';

const context: QuickContext = {
  projects: [
    buildProject(),
    buildProject({ id: 'internal', name: 'Internal', client: undefined }),
    buildProject({ id: 'legacy', name: 'Legacy', status: 'archived' }),
  ],
  running: null,
  recent: recentEntries([
    buildEntry({ description: 'auth refactor' }),
    buildEntry({
      project: 'internal',
      description: 'inbox zero',
      start: '2026-11-07T09:00:00+02:00',
    }),
  ]),
};

const kinds = (text: string) => buildItems(text, context).map((item) => item.id);

describe('buildItems', () => {
  test('lists only the latest recent entry for empty text', () => {
    expect(kinds('  ')).toEqual(['recent:0']);
  });

  test('puts a start row above the matching recent entries', () => {
    expect(kinds('inbox')).toEqual(['start', 'recent:0']);
    const [start] = buildItems('inbox', context);
    expect(start?.kind === 'start' && start.plan.input.description).toBe('inbox');
  });

  test('completes projects while an @query is typed, active ones only', () => {
    expect(kinds('auth @')).toEqual(['project:acme-website', 'project:internal']);
    expect(kinds('auth @in')).toEqual(['project:internal', 'create-project']);
    expect(kinds('auth @leg')).toEqual(['create-project']);
  });

  test('offers no create row for an exact match', () => {
    expect(kinds('auth @internal')).toEqual(['project:internal']);
  });
});
