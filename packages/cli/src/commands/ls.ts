import { queryEntries } from '@ttime/core';

import type { CliContext } from '../runtime/context';
import { parseRange } from './dates';
import { type EntryView, entryView } from './views';

/** Which entries to list; the range defaults to today. */
export type ListInput = {
  readonly period?: string;
  readonly from?: string;
  readonly to?: string;
  readonly project?: string;
  readonly tag?: string;
  readonly query?: string;
};

/** Entries of a range, by start, with the total. */
export type ListResult = {
  readonly from: string;
  readonly to: string;
  readonly entries: readonly EntryView[];
  readonly seconds: number;
};

/** Lists finished entries, filtered by project, tag or text. */
export const ls = async (ctx: CliContext, input: ListInput): Promise<ListResult> => {
  const snapshot = await ctx.vault.read();
  const range = parseRange(input, ctx.clock.now(), snapshot, 'today');
  const entries = queryEntries(snapshot.days, {
    ...range,
    ...(input.project === undefined ? {} : { project: input.project }),
    ...(input.tag === undefined ? {} : { tag: input.tag }),
    ...(input.query === undefined ? {} : { query: input.query }),
  }).map((entry) => entryView(entry, snapshot.projects));
  return { ...range, entries, seconds: entries.reduce((sum, entry) => sum + entry.seconds, 0) };
};
