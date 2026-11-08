#!/usr/bin/env bun
import { argv, env, exit } from 'node:process';
import { parseArgs } from 'node:util';

import type { Change, Logger } from '@ttime/core';

import { serveStdio } from './mcp/server';
import { presentDryRun } from './presenters/misc';
import { type Output, ROUTES, USAGE } from './routes';
import { openContext } from './runtime/context';
import { EXIT, handleError } from './runtime/handle-error';
import { createCliLogger } from './runtime/logger';
import { writeOut } from './runtime/output';

const GLOBAL = {
  vault: { type: 'string' },
  json: { type: 'boolean' },
  'dry-run': { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
} as const;

/** Writes a command's output as text or JSON, with what a dry run would change. */
const print = (
  output: Output,
  changes: readonly Change[],
  mode: { readonly json: boolean; readonly dryRun: boolean },
): void => {
  if (mode.json) {
    const data = mode.dryRun ? { dryRun: true, changes, result: output.data } : output.data;
    writeOut(JSON.stringify(data, null, 2));
  } else {
    writeOut(mode.dryRun ? `${output.text}\n\n${presentDryRun(changes)}` : output.text);
  }
};

/** `ttime mcp [--vault <folder>]`: the MCP server on stdio, actor `mcp`. */
const serve = async (rest: readonly string[], logger: Logger): Promise<number> => {
  try {
    const { values } = parseArgs({ args: [...rest], options: { vault: GLOBAL.vault } });
    await serveStdio({
      ...(values.vault === undefined ? {} : { vault: values.vault }),
      ...(env['TTIME_VAULT'] === undefined ? {} : { envVault: env['TTIME_VAULT'] }),
      logger,
    });
    return EXIT.ok;
  } catch (error) {
    return handleError(error, logger);
  }
};

const main = async (words: readonly string[]): Promise<number> => {
  const logger = createCliLogger(env['TTIME_LOG']);
  const [name = 'help', ...rest] = words;
  if (name === 'mcp') {
    return serve(rest, logger);
  }
  const route = ROUTES[name];
  if (route === undefined) {
    writeOut(USAGE);
    return name === 'help' || name === '--help' || name === '-h' ? EXIT.ok : EXIT.user;
  }
  try {
    const { values, positionals } = parseArgs({
      args: [...rest],
      options: { ...GLOBAL, ...route.options },
      allowPositionals: true,
    });
    if (values.help === true) {
      writeOut(USAGE);
      return EXIT.ok;
    }
    const dryRun = values['dry-run'] === true;
    const ctx = await openContext({
      ...(typeof values.vault === 'string' ? { vault: values.vault } : {}),
      ...(env['TTIME_VAULT'] === undefined ? {} : { envVault: env['TTIME_VAULT'] }),
      actor: 'cli',
      dryRun,
      logger,
    });
    const output = await route.run(ctx, { values, positionals });
    print(
      output,
      ctx.reports.flatMap((report) => report.changes),
      {
        json: values.json === true,
        dryRun,
      },
    );
    return output.exit;
  } catch (error) {
    return handleError(error, logger);
  }
};

exit(await main(argv.slice(2)));
