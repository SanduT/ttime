import { buildDay, buildEntry, buildProject, buildRunning, vaultConfigSchema } from '@ttime/core';
import { expect, test } from 'bun:test';

import { summarize } from './summarize';

test('summarize counts records and passes issues through', () => {
  const issue = {
    code: 'file.invalid_json',
    severity: 'error',
    file: 'projects/x.json',
    path: [],
    message: 'Unexpected end of JSON input',
  } as const;
  const summary = summarize({
    config: vaultConfigSchema.parse({
      schema: 1,
      name: 'Work',
      createdAt: '2026-11-01T09:00:00+02:00',
    }),
    clients: new Map(),
    projects: new Map([['acme-website', buildProject()]]),
    days: new Map([['2026-11-08', buildDay('2026-11-08', [buildEntry(), buildEntry()])]]),
    running: buildRunning(),
    issues: [issue],
    readOnly: false,
  });
  expect(summary).toEqual({
    name: 'Work',
    projects: 1,
    clients: 0,
    days: 1,
    entries: 2,
    running: true,
    readOnly: false,
    issues: [issue],
  });
});
