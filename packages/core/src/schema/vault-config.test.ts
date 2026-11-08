import { expect, test } from 'bun:test';

import { DEFAULT_SETTINGS, type VaultConfig, vaultConfigSchema } from './vault-config';

const config: VaultConfig = {
  schema: 1,
  name: 'My time',
  createdAt: '2026-11-08T12:00:00+02:00',
  settings: {
    weekStartsOn: 'monday',
    dayStartsAt: '04:00',
    workingHours: { days: ['mon', 'tue'], start: '09:00', end: '18:00' },
    defaultCurrency: 'EUR',
    rounding: { mode: 'nearest', minutes: 15, scope: 'day' },
    csv: { delimiter: ';', decimalSeparator: ',', bom: true },
  },
};

test('the ARCHITECTURE example parses unchanged', () => {
  expect(vaultConfigSchema.parse(config)).toEqual(config);
});

test('missing settings fall back to the defaults', () => {
  const { settings, ...bare } = config;
  expect(vaultConfigSchema.parse(bare).settings).toEqual({
    ...DEFAULT_SETTINGS,
    workingHours: {
      ...DEFAULT_SETTINGS.workingHours,
      days: [...DEFAULT_SETTINGS.workingHours.days],
    },
  });
});

test('partial settings keep what is given and default the rest', () => {
  const parsed = vaultConfigSchema.parse({ ...config, settings: { dayStartsAt: '04:00' } });
  expect(parsed.settings.dayStartsAt).toBe('04:00');
  expect(parsed.settings.rounding.mode).toBe('none');
});

test('rounding intervals are limited to the documented values', () => {
  const bad = { ...config, settings: { rounding: { mode: 'up', minutes: 7, scope: 'entry' } } };
  expect(vaultConfigSchema.safeParse(bad).success).toBe(false);
});
