import { describe, expect, test } from 'bun:test';

import { buildProject, buildRunning } from '../testing/builders';
import { planQuickInput } from './quick-plan';
import type { RecentEntry } from './recent-entries';

const ACME = buildProject();
const INTERNAL = buildProject({ id: 'internal', name: 'Internal', client: undefined });
const LEGACY = buildProject({ id: 'legacy', name: 'Legacy', status: 'archived' });
const PROJECTS = [ACME, INTERNAL, LEGACY];

const recent = (project: string): RecentEntry => ({
  project,
  description: 'x',
  tags: [],
  billable: true,
  lastStart: '2026-11-08T09:00:00+02:00',
});

const context = { projects: PROJECTS, running: null, recent: [] };

describe('planQuickInput', () => {
  test('uses the best match for @project', () => {
    const plan = planQuickInput('auth refactor @acme -20m', context);
    expect(plan.project).toEqual({ kind: 'existing', project: ACME });
    expect(plan.input).toMatchObject({
      description: 'auth refactor',
      start: { kind: 'offset', seconds: 1200 },
    });
    expect(plan.running).toBeNull();
  });

  test('prefers an active project over an archived one', () => {
    const legacyApp = buildProject({ id: 'legacy-app', name: 'Legacy App' });
    const plan = planQuickInput('@leg', { ...context, projects: [...PROJECTS, legacyApp] });
    expect(plan.project).toEqual({ kind: 'existing', project: legacyApp });
  });

  test('offers a new project when nothing matches', () => {
    const plan = planQuickInput('kickoff @globex', context);
    expect(plan.project).toEqual({ kind: 'new', name: 'globex' });
  });

  test('without @project, uses the running entry project', () => {
    const running = buildRunning({ project: 'internal' });
    const plan = planQuickInput('standup', {
      ...context,
      running,
      recent: [recent('acme-website')],
    });
    expect(plan.project).toEqual({ kind: 'existing', project: INTERNAL });
    expect(plan.running).toBe(running);
  });

  test('without @project or a running entry, uses the latest active recent project', () => {
    const plan = planQuickInput('standup', {
      ...context,
      recent: [recent('legacy'), recent('gone'), recent('acme-website')],
    });
    expect(plan.project).toEqual({ kind: 'existing', project: ACME });
  });

  test('has no project when nothing suggests one', () => {
    expect(planQuickInput('standup', context).project).toBeNull();
  });
});
