import { z } from 'zod';

/** A time: ISO 8601 with offset, `YYYY-MM-DDTHH:MM` in `tz`, or `HH:MM` today. */
export const time = (what: string): z.ZodString =>
  z
    .string()
    .describe(
      `${what}: ISO 8601 with offset (2026-11-07T14:00:00+01:00), or local 2026-11-07T14:00 in tz.`,
    );

/** A date: `YYYY-MM-DD`, `today` or `yesterday`. */
export const date = (what: string): z.ZodString =>
  z.string().describe(`${what}: YYYY-MM-DD, today or yesterday.`);

/** A period preset. */
export const period = z
  .enum(['today', 'this-week', 'last-week', 'this-month', 'last-month', 'this-year'])
  .optional()
  .describe('A period instead of from and to.');

/** A project ID (an immutable slug like acme-website). */
export const projectId = z
  .string()
  .describe('Project ID, a slug like acme-website (see list_projects).');
