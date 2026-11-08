import { buildProject, buildRunning } from '@ttime/core';
import { describe, expect, test } from 'bun:test';

import { toRunningSummary } from './running-summary';

describe('toRunningSummary', () => {
  const projects = new Map([['acme-website', buildProject()]]);

  test('is null when nothing runs', () => {
    expect(toRunningSummary(null, projects)).toBeNull();
  });

  test('names the project and its color', () => {
    expect(toRunningSummary(buildRunning(), projects)).toEqual({
      start: '2026-11-08T09:00:00+02:00',
      projectName: 'Acme Website',
      color: '#4F7CFF',
    });
  });

  test('falls back to the slug and gray for a missing project', () => {
    expect(toRunningSummary(buildRunning({ project: 'gone' }), projects)).toMatchObject({
      projectName: 'gone',
      color: '#8E8E93',
    });
  });
});
