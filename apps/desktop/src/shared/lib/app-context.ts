import type { Logger } from '@ttime/core';

import { createLogger } from '../adapters/logger';
import { createRandomIds, createSystemClock } from '../adapters/system';
import { createTauriFs } from '../adapters/tauri-fs';
import { vaultControlApi } from '../bridge/vault-api';
import { createVaultSession, type VaultSession } from './vault-session';

/** Everything a window needs to talk to the vault. One per window. */
export type AppContext = {
  readonly session: VaultSession;
  readonly logger: Logger;
  readonly onVaultChanged: (onChange: (paths: readonly string[]) => void) => Promise<() => void>;
};

let context: Promise<AppContext> | undefined;

const build = async (): Promise<AppContext> => {
  const logger = createLogger();
  const clock = createSystemClock();
  const env = await vaultControlApi.env();
  const session = createVaultSession({
    control: vaultControlApi,
    fs: createTauriFs(),
    env,
    clock,
    ids: createRandomIds(clock),
    logger,
  });
  return { session, logger, onVaultChanged: vaultControlApi.onChanged };
};

/** The window's context, created on first use. */
export const getAppContext = (): Promise<AppContext> => {
  context ??= build();
  return context;
};
