import type { CallToolResult } from '@modelcontextprotocol/sdk/types';
import {
  type Change,
  type ClockPort,
  type EnvPort,
  isTTimeError,
  type Logger,
  Temporal,
  TTimeError,
} from '@ttime/core';

import { type CliContext, openContext } from '../runtime/context';

/** Writes touching more records than this need a preview and then `confirm: true`. */
const BULK_LIMIT = 3;

/** What every tool call needs to open the vault. */
export type ToolDeps = {
  readonly vault?: string;
  readonly envVault?: string;
  readonly logger: Logger;
  readonly env?: EnvPort;
  readonly clock?: ClockPort;
};

/** Arguments every tool accepts; writes also take `dryRun` and `confirm`. */
export type CommonArgs = {
  readonly tz?: string | undefined;
  readonly dryRun?: boolean | undefined;
  readonly confirm?: boolean | undefined;
};

const systemClock = (deps: ToolDeps, tz: string | undefined): ClockPort | undefined => {
  if (tz === undefined) {
    return deps.clock;
  }
  try {
    Temporal.Now.zonedDateTimeISO(tz);
  } catch (error) {
    throw new TTimeError(
      'input.invalid',
      `Unknown time zone "${tz}". Use an IANA name like Europe/Berlin.`,
      { cause: error },
    );
  }
  const base = deps.clock;
  return {
    now: () =>
      base === undefined ? Temporal.Now.zonedDateTimeISO(tz) : base.now().withTimeZone(tz),
    sleep: (ms) => base?.sleep(ms) ?? new Promise((resolve) => setTimeout(resolve, ms)),
  };
};

const open = async (
  deps: ToolDeps,
  tz: string | undefined,
  dryRun: boolean,
): Promise<CliContext> => {
  const clock = systemClock(deps, tz);
  return openContext({
    ...(deps.vault === undefined ? {} : { vault: deps.vault }),
    ...(deps.envVault === undefined ? {} : { envVault: deps.envVault }),
    ...(deps.env === undefined ? {} : { env: deps.env }),
    ...(clock === undefined ? {} : { clock }),
    actor: 'mcp',
    dryRun,
    logger: deps.logger,
  });
};

const json = (data: unknown, isError = false): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  ...(isError ? { isError } : {}),
});

const changesOf = (ctx: CliContext): Change[] => ctx.reports.flatMap((report) => report.changes);

const records = (changes: readonly Change[]): number =>
  new Set(changes.map((change) => `${change.kind}:${change.id}`)).size;

const runWrite = async (
  deps: ToolDeps,
  args: CommonArgs,
  run: (ctx: CliContext) => Promise<unknown>,
): Promise<CallToolResult> => {
  if (args.dryRun === true || args.confirm !== true) {
    const dry = await open(deps, args.tz, true);
    const result = await run(dry);
    const changes = changesOf(dry);
    if (args.dryRun === true) {
      return json({ dryRun: true, changes, result });
    }
    if (records(changes) > BULK_LIMIT) {
      return json({
        needsConfirmation: true,
        records: records(changes),
        changes,
        message: `This changes ${String(records(changes))} records. Show the user what will change, then call again with confirm: true.`,
      });
    }
  }
  const ctx = await open(deps, args.tz, false);
  const result = await run(ctx);
  const changes = changesOf(ctx);
  const batches = [...new Set(changes.map((change) => change.batch))];
  return json({ result, batches, changes });
};

/**
 * Runs one tool call: opens the vault (actor `mcp`), applies the dry-run and bulk-confirm rules
 * for writes, and turns errors into error results. The MCP server's only catch site.
 */
export const runTool = async (
  deps: ToolDeps,
  name: string,
  args: CommonArgs,
  write: boolean,
  run: (ctx: CliContext) => Promise<unknown>,
): Promise<CallToolResult> => {
  try {
    if (write) {
      return await runWrite(deps, args, run);
    }
    return json(await run(await open(deps, args.tz, false)));
  } catch (error) {
    if (isTTimeError(error)) {
      return json({ code: error.code, message: error.message }, true);
    }
    deps.logger.error(`Tool ${name} failed`, {
      error: error instanceof Error ? (error.stack ?? error.message) : String(error),
    });
    return json(
      { code: 'internal', message: 'Something went wrong. The details are in the server log.' },
      true,
    );
  }
};
