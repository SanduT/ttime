import { currentTotals, DEFAULT_SETTINGS } from '@ttime/core';

import type { CliContext } from '../runtime/context';
import { allEntries, type EntryView, runningView } from './views';

type PeriodTotal = {
  readonly seconds: number;
  readonly byProject: readonly {
    readonly project: string;
    readonly name: string;
    readonly seconds: number;
  }[];
};

/** What `ttime status` and the `status` tool return. */
export type StatusResult = {
  readonly running: EntryView | null;
  readonly today: PeriodTotal & { readonly date: string };
  readonly week: PeriodTotal & { readonly start: string };
};

/** The running entry and today's and this week's totals (running time included). */
export const status = async (ctx: CliContext): Promise<StatusResult> => {
  const snapshot = await ctx.vault.read();
  const now = ctx.clock.now();
  const totals = currentTotals({
    entries: allEntries(snapshot),
    running: snapshot.running,
    now,
    settings: snapshot.config?.settings ?? DEFAULT_SETTINGS,
  });
  const named = <T extends { readonly byProject: readonly { project: string; seconds: number }[] }>(
    total: T,
  ) => ({
    ...total,
    byProject: total.byProject.map((item) => ({
      project: item.project,
      name: snapshot.projects.get(item.project)?.name ?? item.project,
      seconds: item.seconds,
    })),
  });
  return {
    running:
      snapshot.running === null
        ? null
        : runningView(snapshot.running, snapshot.projects, now.epochMilliseconds / 1000),
    today: named(totals.today),
    week: named(totals.week),
  };
};
