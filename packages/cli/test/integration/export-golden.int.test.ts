import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createExportService, type ExportMode } from '@ttime/core';
import { afterEach, describe, expect, test } from 'bun:test';

import { openFixture, type TempDir } from './support/temp-vault';

const EXPECTED = join(import.meta.dir, '..', '..', '..', 'core', 'fixtures', 'reports', 'basic');

let opened: TempDir | null = null;

afterEach(async () => {
  await opened?.cleanup();
  opened = null;
});

const exportBasic = async (mode: ExportMode) => {
  const fixture = await openFixture('basic');
  opened = fixture;
  const exports = createExportService({
    vault: fixture.vault,
    timeZone: () => 'Europe/Bucharest',
    logger: fixture.deps.logger,
  });
  const result = await exports.exportCsv({
    from: '2026-11-01',
    to: '2026-11-30',
    project: null,
    mode,
    rounding: { mode: 'nearest', minutes: 15, scope: 'entry' },
    csv: { delimiter: ',', decimalSeparator: '.', bom: false },
  });
  return readFile(join(fixture.root, result.path), 'utf8');
};

describe('golden CSV exports of the basic fixture', () => {
  test.each(['detailed', 'daily'] as const)('%s matches the expected file', async (mode) => {
    const expected = await readFile(join(EXPECTED, `${mode}.csv`), 'utf8');
    expect(await exportBasic(mode)).toBe(expected);
  });
});
