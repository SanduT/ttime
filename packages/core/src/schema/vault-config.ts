import { z } from 'zod';

import {
  currencySchema,
  localTimeSchema,
  schemaVersionSchema,
  timestampSchema,
} from './primitives';

const weekdaySchema = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

const weekStartSchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

const workingHoursSchema = z.looseObject({
  days: z.array(weekdaySchema),
  start: localTimeSchema,
  end: localTimeSchema,
});

const roundingSchema = z.looseObject({
  mode: z.enum(['none', 'up', 'down', 'nearest']),
  minutes: z.union([1, 5, 6, 10, 15, 30].map((minutes) => z.literal(minutes))),
  scope: z.enum(['entry', 'day']),
});

const csvSchema = z.looseObject({
  delimiter: z.enum([',', ';']),
  decimalSeparator: z.enum(['.', ',']),
  bom: z.boolean(),
});

/** Settings used when `ttime.json` leaves them out. */
export const DEFAULT_SETTINGS = {
  weekStartsOn: 'monday',
  dayStartsAt: '00:00',
  workingHours: { days: ['mon', 'tue', 'wed', 'thu', 'fri'], start: '09:00', end: '18:00' },
  defaultCurrency: 'EUR',
  rounding: { mode: 'none', minutes: 15, scope: 'entry' },
  csv: { delimiter: ',', decimalSeparator: '.', bom: true },
} as const;

const settingsSchema = z.looseObject({
  weekStartsOn: weekStartSchema.default(DEFAULT_SETTINGS.weekStartsOn),
  dayStartsAt: localTimeSchema.default(DEFAULT_SETTINGS.dayStartsAt),
  workingHours: workingHoursSchema.default({
    ...DEFAULT_SETTINGS.workingHours,
    days: [...DEFAULT_SETTINGS.workingHours.days],
  }),
  defaultCurrency: currencySchema.default(DEFAULT_SETTINGS.defaultCurrency),
  rounding: roundingSchema.default({ ...DEFAULT_SETTINGS.rounding }),
  csv: csvSchema.default({ ...DEFAULT_SETTINGS.csv }),
});

/** `ttime.json`: vault-level settings that change what reports mean. */
export const vaultConfigSchema = z.looseObject({
  schema: schemaVersionSchema,
  name: z.string().min(1),
  createdAt: timestampSchema,
  settings: z.preprocess((value) => value ?? {}, settingsSchema),
});

/** Parsed `ttime.json`. */
export type VaultConfig = z.infer<typeof vaultConfigSchema>;

/** Vault-level settings. */
export type VaultSettings = VaultConfig['settings'];
