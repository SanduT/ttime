import {
  DEFAULT_SETTINGS,
  type Rounding,
  summarize,
  type Summary,
  type SummaryGroupBy,
  TTimeError,
} from '@ttime/core';

import type { CliContext } from '../runtime/context';
import { parseRange } from './dates';
import { allEntries } from './views';

const GROUPS: readonly SummaryGroupBy[] = ['project', 'day', 'tag', 'description'];
const MODES: readonly Rounding['mode'][] = ['none', 'up', 'down', 'nearest'];

/** A report request; the range defaults to this week, rounding to the vault default. */
export type ReportInput = {
  readonly period?: string;
  readonly from?: string;
  readonly to?: string;
  readonly project?: string;
  readonly group?: string;
  /** `nearest:15`, `up:6`, `none`; `:day` at the end rounds each project day. */
  readonly rounding?: string;
};

/** Totals and groups of a range. */
export type ReportResult = Summary & {
  readonly from: string;
  readonly to: string;
  readonly rounding: Rounding;
};

/** Parses `mode[:minutes[:scope]]`. */
export const parseRounding = (value: string, fallback: Rounding): Rounding => {
  const [mode, minutes, scope] = value.split(':');
  const known = MODES.find((item) => item === mode);
  const count = minutes === undefined ? fallback.minutes : Number(minutes);
  if (known === undefined || !Number.isInteger(count) || count < 1 || count > 60) {
    throw new TTimeError('input.invalid', 'Use rounding like nearest:15, up:6:day or none.');
  }
  return { mode: known, minutes: count, scope: scope === 'day' ? 'day' : 'entry' };
};

/** Summarizes a range grouped by project, day, tag or description. */
export const report = async (ctx: CliContext, input: ReportInput): Promise<ReportResult> => {
  const snapshot = await ctx.vault.read();
  const range = parseRange(input, ctx.clock.now(), snapshot, 'this-week');
  const settings = snapshot.config?.settings ?? DEFAULT_SETTINGS;
  const groupBy = GROUPS.find((group) => group === (input.group ?? 'project'));
  if (groupBy === undefined) {
    throw new TTimeError('input.invalid', `Group by ${GROUPS.join(', ')}.`);
  }
  const rounding =
    input.rounding === undefined
      ? settings.rounding
      : parseRounding(input.rounding, settings.rounding);
  const summary = summarize(
    {
      entries: allEntries(snapshot),
      ...range,
      project: input.project ?? null,
      projects: snapshot.projects,
      clients: snapshot.clients,
      timeZone: ctx.timeZone,
      dayStartsAt: settings.dayStartsAt,
      rounding,
    },
    groupBy,
  );
  return { ...summary, ...range, rounding };
};
