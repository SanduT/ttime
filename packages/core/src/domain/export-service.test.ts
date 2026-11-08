import { describe, expect, test } from 'bun:test';

import { createDomainTestVault } from '../testing/domain-vault';
import { errorCodeOf } from '../testing/errors';
import { createExportService } from './export-service';

const setup = async () => {
  const tv = await createDomainTestVault();
  const exports = createExportService({
    vault: tv.vault,
    timeZone: () => 'Europe/Bucharest',
    logger: tv.logger,
  });
  return { ...tv, exports };
};

describe('exportCsv', () => {
  test('writes the period to exports/ with the vault defaults and logs no change', async () => {
    const t = await setup();
    await t.entries.create({
      project: 'acme-website',
      start: '2026-11-02T09:00:00+02:00',
      end: '2026-11-02T10:00:00+02:00',
    });
    await t.entries.create({
      project: 'internal',
      start: '2026-11-03T09:00:00+02:00',
      end: '2026-11-03T09:30:00+02:00',
    });
    const linesBefore = (await t.changelog()).length;
    const result = await t.exports.exportCsv({
      from: '2026-11-01',
      to: '2026-11-30',
      project: 'acme-website',
      mode: 'detailed',
    });
    expect(result).toMatchObject({
      path: 'exports/acme-website_2026-11-01_2026-11-30_detailed.csv',
      rows: 1,
    });
    const text = await t.readRaw(result.path);
    expect(text?.startsWith('﻿date,start,end')).toBe(true);
    expect(text).toContain('2026-11-02,09:00,10:00,1.00,1:00,Acme Website');
    expect((await t.changelog()).length).toBe(linesBefore);
  });

  test('includes an entry from the day before that runs into the period', async () => {
    const t = await setup();
    await t.entries.create({
      project: 'acme-website',
      start: '2026-10-31T23:00:00+02:00',
      end: '2026-11-01T01:00:00+02:00',
    });
    const result = await t.exports.exportCsv({
      from: '2026-11-01',
      to: '2026-11-30',
      project: null,
      mode: 'daily',
      rounding: { mode: 'up', minutes: 30, scope: 'day' },
      csv: { delimiter: ';', decimalSeparator: ',', bom: false },
    });
    expect(result.totals.seconds).toBe(3600);
    expect(await t.readRaw(result.path)).toContain('2026-11-01;1,00;1:00;Acme Website');
  });

  test('refuses file names with folders', async () => {
    const t = await setup();
    const write = t.vault.transact((tx) => {
      tx.writeExport('../escape.csv', 'x');
      return Promise.resolve();
    });
    expect(await errorCodeOf(write)).toBe('input.invalid');
  });
});
