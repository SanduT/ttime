import type { EntryPatch } from '@ttime/core';

import type { CliContext } from '../runtime/context';
import { parseTime } from './dates';
import { type EntryView, entryView } from './views';

/** Fields to change on a finished entry. Times as in {@link parseTime}. */
export type EntryChanges = {
  readonly project?: string;
  readonly description?: string;
  readonly start?: string;
  readonly end?: string;
  readonly tags?: readonly string[];
  readonly billable?: boolean;
};

/** One entry after a change. */
export type EntryResult = { readonly entry: EntryView };

const named = async (ctx: CliContext, entry: Parameters<typeof entryView>[0]) =>
  ({ entry: entryView(entry, (await ctx.vault.read()).projects) }) satisfies EntryResult;

/** Changes a finished entry; moving its start to another day moves it to that day file. */
export const updateEntry = async (
  ctx: CliContext,
  id: string,
  changes: EntryChanges,
): Promise<EntryResult> => {
  const now = ctx.clock.now();
  const patch: EntryPatch = {
    ...(changes.project === undefined ? {} : { project: changes.project }),
    ...(changes.description === undefined ? {} : { description: changes.description }),
    ...(changes.tags === undefined ? {} : { tags: changes.tags }),
    ...(changes.billable === undefined ? {} : { billable: changes.billable }),
    ...(changes.start === undefined ? {} : { start: parseTime(changes.start, now) }),
    ...(changes.end === undefined ? {} : { end: parseTime(changes.end, now) }),
  };
  return named(ctx, await ctx.entries.update(id, patch));
};

/** Moves an entry to the trash (nothing is hard-deleted). */
export const deleteEntry = async (ctx: CliContext, id: string): Promise<EntryResult> =>
  named(ctx, await ctx.entries.delete(id));

/** Brings an entry back from the trash. */
export const restoreEntry = async (ctx: CliContext, id: string): Promise<EntryResult> =>
  named(ctx, await ctx.entries.restore(id));
