import { buildClient, buildProject } from '@ttime/core';
import { describe, expect, test } from 'bun:test';

import { groupProjects } from './group-projects';

const clients = new Map([
  ['acme', buildClient()],
  ['old', buildClient({ id: 'old', name: 'Old Co', archived: true })],
]);
const projects = [
  buildProject({ id: 'b', name: 'Beta' }),
  buildProject({ id: 'a', name: 'Alpha' }),
  buildProject({ id: 'solo', name: 'Solo', client: undefined }),
  buildProject({ id: 'gone', name: 'Gone', status: 'archived' }),
];

const names = (showArchived: boolean) =>
  groupProjects(projects, clients, showArchived).map((group) => [
    group.client?.name ?? null,
    group.projects.map((project) => project.name),
  ]);

describe('groupProjects', () => {
  test('groups active projects by client, with no client last', () => {
    expect(names(false)).toEqual([
      ['Acme GmbH', ['Alpha', 'Beta']],
      [null, ['Solo']],
    ]);
  });

  test('shows archived projects and clients on request', () => {
    expect(names(true)).toEqual([
      ['Acme GmbH', ['Alpha', 'Beta', 'Gone']],
      ['Old Co', []],
      [null, ['Solo']],
    ]);
  });
});
