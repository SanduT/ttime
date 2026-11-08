import { realpath } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  type Actor,
  type ClockPort,
  createClientService,
  createEntryService,
  createExportService,
  createProjectService,
  createQuickActions,
  createTimerService,
  createUndoService,
  createVault,
  type EnvPort,
  type Logger,
  readAppConfig,
  TTimeError,
  type TxReport,
  type Vault,
} from '@ttime/core';

import { createNodeEnv } from '../adapters/node-env';
import { createNodeFs } from '../adapters/node-fs';
import { createRandomIds } from '../adapters/random-ids';
import { createSystemClock } from '../adapters/system-clock';

/** How a command or tool reaches the vault. */
export type ContextOptions = {
  /** `--vault`, else `TTIME_VAULT`, else the vault in `~/.config/ttime/config.json`. */
  readonly vault?: string;
  readonly envVault?: string;
  readonly actor: Actor;
  readonly dryRun: boolean;
  readonly logger: Logger;
  readonly env?: EnvPort;
  readonly clock?: ClockPort;
};

/** The vault, its services and what this run changed. */
export type CliContext = {
  readonly vault: Vault;
  readonly clock: ClockPort;
  readonly timeZone: string;
  readonly dryRun: boolean;
  /** One report per transaction of this run, in order. */
  readonly reports: readonly TxReport[];
  readonly timer: ReturnType<typeof createTimerService>;
  readonly quick: ReturnType<typeof createQuickActions>;
  readonly entries: ReturnType<typeof createEntryService>;
  readonly projects: ReturnType<typeof createProjectService>;
  readonly clients: ReturnType<typeof createClientService>;
  readonly undo: ReturnType<typeof createUndoService>;
  readonly exports: ReturnType<typeof createExportService>;
};

const vaultRoot = async (options: ContextOptions, env: EnvPort): Promise<string> => {
  const fs = createNodeFs();
  const chosen = options.vault ?? options.envVault ?? (await readAppConfig(fs, env))?.vault;
  if (chosen === undefined || chosen === '') {
    throw new TTimeError(
      'vault.not_set',
      'No vault is set. Open one in the app, or pass --vault <folder> (or set TTIME_VAULT).',
    );
  }
  try {
    return await realpath(resolve(chosen));
  } catch (error) {
    throw new TTimeError('vault.not_set', `The vault folder ${chosen} does not exist.`, {
      cause: error,
    });
  }
};

/** Opens the vault for one CLI run or MCP tool call. */
export const openContext = async (options: ContextOptions): Promise<CliContext> => {
  const env = options.env ?? createNodeEnv();
  const clock = options.clock ?? createSystemClock();
  const reports: TxReport[] = [];
  const ids = createRandomIds(clock);
  const vault = createVault({
    fs: createNodeFs(),
    clock,
    env,
    ids,
    logger: options.logger,
    root: await vaultRoot(options, env),
    actor: options.actor,
    dryRun: options.dryRun,
    onTransact: (report) => reports.push(report),
  });
  const { logger } = options;
  const timeZone = clock.now().timeZoneId;
  return {
    vault,
    clock,
    timeZone,
    dryRun: options.dryRun,
    reports,
    timer: createTimerService({ vault, ids, logger }),
    quick: createQuickActions({ vault, clock, ids, logger }),
    entries: createEntryService({ vault, ids, logger }),
    projects: createProjectService({ vault, logger }),
    clients: createClientService({ vault, logger }),
    undo: createUndoService({ vault, logger }),
    exports: createExportService({ vault, logger, timeZone: () => timeZone }),
  };
};
