import { z } from 'zod';

import { moneySchema, schemaVersionSchema, slugSchema, timestampSchema } from './primitives';

/** `clients/<id>.json`. */
export const clientSchema = z.looseObject({
  schema: schemaVersionSchema,
  id: slugSchema,
  name: z.string().min(1),
  defaultRate: moneySchema.optional(),
  notes: z.string().default(''),
  archived: z.boolean().default(false),
  createdAt: timestampSchema,
});

/** A client: optional grouping for projects. */
export type Client = z.infer<typeof clientSchema>;
