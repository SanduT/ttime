import { DEFAULT_SETTINGS, type ExportMode, type ExportResult, TTimeError } from '@ttime/core';

import type { CliContext } from '../runtime/context';
import { parseRange } from './dates';
import { parseRounding } from './report';

/** An export request; the range defaults to last month, options to the vault defaults. */
export type ExportInput = {
  readonly period?: string;
  readonly from?: string;
  readonly to?: string;
  readonly project?: string;
  readonly mode?: string;
  readonly rounding?: string;
};

/** Where the CSV was written (absolute path) and what it holds. */
export type ExportCommandResult = ExportResult & { readonly from: string; readonly to: string };

const MODES: readonly ExportMode[] = ['detailed', 'daily'];

/** Writes a CSV into the vault's `exports/` folder. */
export const exportCsv = async (
  ctx: CliContext,
  input: ExportInput,
): Promise<ExportCommandResult> => {
  const snapshot = await ctx.vault.read();
  const range = parseRange(input, ctx.clock.now(), snapshot, 'last-month');
  const mode = MODES.find((item) => item === (input.mode ?? 'detailed'));
  if (mode === undefined) {
    throw new TTimeError('input.invalid', 'Use --mode detailed or daily.');
  }
  const settings = snapshot.config?.settings ?? DEFAULT_SETTINGS;
  const result = await ctx.exports.exportCsv({
    ...range,
    project: input.project ?? null,
    mode,
    ...(input.rounding === undefined
      ? {}
      : { rounding: parseRounding(input.rounding, settings.rounding) }),
  });
  return { ...result, path: `${ctx.vault.root}/${result.path}`, ...range };
};
