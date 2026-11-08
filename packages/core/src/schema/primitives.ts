import { z } from 'zod';

import { SCHEMA_VERSION } from '../lib/constants';
import { SLUG_PATTERN } from '../lib/slug';
import { isLocalDate, isLocalTime, isTimestamp } from '../lib/time';
import { ULID_PATTERN } from '../lib/ulid';

/** `"schema": 1` on every vault file. */
export const schemaVersionSchema = z.literal(SCHEMA_VERSION);

/** ISO 8601 with seconds and a numeric offset, e.g. `2026-11-08T09:30:00+02:00`. */
export const timestampSchema = z
  .string()
  .refine(isTimestamp, 'Expected a timestamp like 2026-11-08T09:30:00+02:00');

/** A calendar date, `yyyy-mm-dd`. */
export const localDateSchema = z.string().refine(isLocalDate, 'Expected a date like 2026-11-08');

/** A wall-clock time, `HH:MM`. */
export const localTimeSchema = z.string().refine(isLocalTime, 'Expected a time like 09:30');

/** Immutable client and project IDs. */
export const slugSchema = z.string().regex(SLUG_PATTERN, 'Expected a slug like acme-website');

/** Entry IDs. */
export const ulidSchema = z.string().regex(ULID_PATTERN, 'Expected a 26 character ULID');

/** A `#RRGGBB` color. */
export const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Expected a color like #4F7CFF');

/** An ISO 4217 currency code. */
export const currencySchema = z.string().regex(/^[A-Z]{3}$/, 'Expected a currency like EUR');

/** Money as a decimal string plus currency. Never a float. */
export const moneySchema = z.looseObject({
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Expected a decimal amount like 50.00'),
  currency: currencySchema,
});

/** Who wrote a change. */
export const actorSchema = z.enum(['app', 'cli', 'mcp']);

/** A decimal amount with its currency. */
export type Money = z.infer<typeof moneySchema>;

/** Who wrote a change. */
export type Actor = z.infer<typeof actorSchema>;
