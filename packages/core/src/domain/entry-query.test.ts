import { describe, expect, test } from 'bun:test';

import { buildEntry } from '../testing/builders';
import { queryEntries } from './entry-query';

const days = new Map([
  [
    '2026-11-07',
    {
      entries: [
        buildEntry({
          id: 'b',
          description: 'Design',
          start: '2026-11-07T14:00:00+02:00',
          end: '2026-11-07T15:00:00+02:00',
          tags: ['review'],
        }),
        buildEntry({
          id: 'a',
          project: 'internal',
          description: 'Planning',
          start: '2026-11-07T09:00:00+02:00',
          end: '2026-11-07T10:00:00+02:00',
          notes: [{ at: '2026-11-07T09:30:00+02:00', text: 'Auth flow' }],
        }),
      ],
    },
  ],
  ['2026-11-08', { entries: [buildEntry({ id: 'c', description: 'Auth review' })] }],
]);

describe('queryEntries', () => {
  test('lists the range by start', () => {
    expect(queryEntries(days, { from: '2026-11-07', to: '2026-11-08' }).map((e) => e.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(queryEntries(days, { from: '2026-11-08', to: '2026-11-08' }).map((e) => e.id)).toEqual([
      'c',
    ]);
  });

  test('filters by project, tag and text in descriptions or notes', () => {
    const range = { from: '2026-11-01', to: '2026-11-30' };
    expect(queryEntries(days, { ...range, project: 'internal' }).map((e) => e.id)).toEqual(['a']);
    expect(queryEntries(days, { ...range, tag: 'review' }).map((e) => e.id)).toEqual(['b']);
    expect(queryEntries(days, { ...range, query: 'AUTH' }).map((e) => e.id)).toEqual(['a', 'c']);
  });
});
