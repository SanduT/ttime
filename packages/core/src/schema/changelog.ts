import { z } from 'zod';

import { actorSchema, timestampSchema, ulidSchema } from './primitives';

/** What a changelog line did. */
const changeOpSchema = z.enum(['create', 'update', 'delete', 'restore', 'start', 'stop', 'note']);

/** Which kind of record a changelog line touched. */
const changeKindSchema = z.enum(['entry', 'project', 'client', 'config']);

/** One line of `changelog/<yyyy-mm>.jsonl`. `before` and `after` are full records or null. */
export const changeSchema = z.looseObject({
  actor: actorSchema,
  op: changeOpSchema,
  kind: changeKindSchema,
  id: z.string().min(1),
  at: timestampSchema,
  batch: ulidSchema,
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
});

/** A changelog line. */
export type Change = z.infer<typeof changeSchema>;
/** What a change did. */
export type ChangeOp = z.infer<typeof changeOpSchema>;
/** Which kind of record changed. */
export type ChangeKind = z.infer<typeof changeKindSchema>;
