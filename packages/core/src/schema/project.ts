import { z } from 'zod';

import {
  colorSchema,
  localDateSchema,
  moneySchema,
  schemaVersionSchema,
  slugSchema,
  timestampSchema,
} from './primitives';

const targetSchema = z.looseObject({
  hours: z.number().positive(),
  per: z.enum(['week', 'month']),
});

/** `projects/<id>.json`. `client`, `rate`, `target` and `invoicedThrough` are optional. */
export const projectSchema = z.looseObject({
  schema: schemaVersionSchema,
  id: slugSchema,
  name: z.string().min(1),
  client: slugSchema.optional(),
  color: colorSchema,
  billable: z.boolean().default(true),
  rate: moneySchema.optional(),
  billingPeriod: z.enum(['weekly', 'monthly']).default('monthly'),
  target: targetSchema.optional(),
  status: z.enum(['active', 'archived']).default('active'),
  invoicedThrough: localDateSchema.nullable().optional(),
  createdAt: timestampSchema,
});

/** A project: what time is billed to. */
export type Project = z.infer<typeof projectSchema>;
