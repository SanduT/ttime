import { type Actor, TTimeError } from '@ttime/core';

import type { CliContext } from '../runtime/context';

/** The batch that was reverted and the new batch that reverted it. */
export type UndoResult = {
  readonly undone: string;
  readonly batch: string;
  readonly changes: number;
};

/** Reverts `batch`, or the latest change made by `actor`. */
export const undo = async (
  ctx: CliContext,
  options: { readonly batch?: string; readonly actor: Actor },
): Promise<UndoResult> => {
  const target =
    options.batch === undefined
      ? (await ctx.undo.state(options.actor)).undo
      : ((await ctx.undo.history()).find((item) => item.batch === options.batch) ?? null);
  if (target === null) {
    throw new TTimeError('undo.not_found', 'There is nothing to undo.');
  }
  const batch = await ctx.undo.undo(target.batch);
  return { undone: target.batch, batch, changes: target.changes.length };
};
