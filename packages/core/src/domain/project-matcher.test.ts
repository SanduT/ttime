import { describe, expect, test } from 'bun:test';

import { buildProject } from '../testing/builders';
import { matchProjects } from './project-matcher';

const projects = [
  buildProject({ id: 'acme-website', name: 'Acme Website' }),
  buildProject({ id: 'acme-app', name: 'Acme App' }),
  buildProject({ id: 'globex', name: 'Globex Café' }),
  buildProject({ id: 'internal', name: 'Internal', status: 'archived' }),
  buildProject({ id: 'intranet', name: 'Intranet' }),
];
const ids = (query: string): string[] => matchProjects(query, projects).map((m) => m.project.id);

describe('matchProjects', () => {
  test('an exact slug wins', () => {
    expect(matchProjects('acme-app', projects)[0]).toMatchObject({ kind: 'slug' });
  });

  test('an exact name matches regardless of case and accents', () => {
    expect(matchProjects('GLOBEX cafe', projects)[0]).toMatchObject({
      kind: 'name',
      project: { id: 'globex' },
    });
  });

  test('prefixes of the name or of any word match, shortest name first', () => {
    expect(ids('acme')).toEqual(['acme-app', 'acme-website']);
    expect(ids('web')).toEqual(['acme-website']);
  });

  test('subsequences match with fewer gaps ranked first', () => {
    expect(ids('aws')).toEqual(['acme-website']);
    expect(matchProjects('aws', projects)[0]?.kind).toBe('subsequence');
  });

  test('archived projects rank after active ones of the same kind', () => {
    expect(ids('int')).toEqual(['intranet', 'internal']);
  });

  test('no match or an empty query gives no candidates', () => {
    expect(ids('zzz')).toEqual([]);
    expect(ids('  ')).toEqual([]);
  });
});
