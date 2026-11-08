import { describe, expect, test } from 'bun:test';

import { completeProject, projectQueryAtEnd, segmentText } from './tokens';

describe('segmentText', () => {
  test('marks tokens and keeps the text intact', () => {
    const text = 'auth  refactor @acme #dev -1h15 at 9:30 $';
    const segments = segmentText(text);
    expect(segments.map((segment) => segment.text).join('')).toBe(text);
    expect(segments.filter((segment) => segment.kind !== 'space')).toEqual([
      { text: 'auth', kind: 'text' },
      { text: 'refactor', kind: 'text' },
      { text: '@acme', kind: 'project' },
      { text: '#dev', kind: 'tag' },
      { text: '-1h15', kind: 'time' },
      { text: 'at', kind: 'time' },
      { text: '9:30', kind: 'time' },
      { text: '$', kind: 'billable' },
    ]);
  });

  test('leaves a lone "at" and a lone @ as text', () => {
    expect(segmentText('look at this @').map((segment) => segment.kind)).toEqual([
      'text',
      'space',
      'text',
      'space',
      'text',
      'space',
      'text',
    ]);
  });
});

describe('projectQueryAtEnd', () => {
  test('finds the @query being typed', () => {
    expect(projectQueryAtEnd('auth @ac')).toBe('ac');
    expect(projectQueryAtEnd('@')).toBe('');
  });

  test('is null once the token is finished or absent', () => {
    expect(projectQueryAtEnd('auth @acme ')).toBeNull();
    expect(projectQueryAtEnd('mail me@example')).toBeNull();
    expect(projectQueryAtEnd('auth')).toBeNull();
  });
});

describe('completeProject', () => {
  test('replaces the query with the slug', () => {
    expect(completeProject('auth @ac', 'acme-website')).toBe('auth @acme-website ');
  });
});
