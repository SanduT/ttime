import { buildEntry, buildProject } from '@ttime/core';
import { describe, expect, test } from 'bun:test';

import { clockOf, resumeLabel } from './display';

describe('clockOf', () => {
  test('reads HH:MM from a timestamp', () => {
    expect(clockOf('2026-11-08T09:05:00+02:00')).toBe('09:05');
  });
});

describe('resumeLabel', () => {
  const projects = new Map([['acme-website', buildProject()]]);

  test('is the description', () => {
    expect(resumeLabel(buildEntry({ description: 'Auth review' }), projects)).toBe('Auth review');
  });

  test('is the project name for an entry without a description', () => {
    expect(resumeLabel(buildEntry({ description: '' }), projects)).toBe('Acme Website');
  });

  test('shortens long descriptions', () => {
    const label = resumeLabel(buildEntry({ description: 'x'.repeat(60) }), projects);
    expect(label).toHaveLength(40);
    expect(label.endsWith('…')).toBe(true);
  });
});
