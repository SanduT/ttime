import { z } from 'zod';

import type { ProjectFields } from '../../commands/projects';

/** Project fields shared by create and update. */
export const PROJECT_FIELDS = {
  client: z.string().optional().describe('Client ID; "none" removes it (update only).'),
  color: z.string().optional().describe('#RRGGBB.'),
  rate: z
    .string()
    .optional()
    .describe('Hourly rate like "60" or "60.00 EUR"; "none" removes it (update only).'),
  billable: z.boolean().optional(),
  billingPeriod: z.enum(['weekly', 'monthly']).optional(),
};

/** Project fields from tool arguments, leaving out the ones not given. */
export const projectFieldsOf = (args: {
  readonly client?: string | undefined;
  readonly color?: string | undefined;
  readonly rate?: string | undefined;
  readonly billable?: boolean | undefined;
  readonly billingPeriod?: 'weekly' | 'monthly' | undefined;
  readonly name?: string | undefined;
}): ProjectFields => ({
  ...(args.name === undefined ? {} : { name: args.name }),
  ...(args.client === undefined ? {} : { client: args.client }),
  ...(args.color === undefined ? {} : { color: args.color }),
  ...(args.rate === undefined ? {} : { rate: args.rate }),
  ...(args.billable === undefined ? {} : { billable: args.billable }),
  ...(args.billingPeriod === undefined ? {} : { billingPeriod: args.billingPeriod }),
});
