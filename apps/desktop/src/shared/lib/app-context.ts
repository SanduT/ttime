import type { ClockPort, IdGenerator, Logger } from '@ttime/core';

import { createLogger } from '../adapters/logger';
import { createRandomIds, createSystemClock } from '../adapters/system';
import { createTauriFs } from '../adapters/tauri-fs';
import { vaultControlApi } from '../bridge/vault-api';
import { createVaultSession, type VaultSession } from './vault-session';

/** Everything a window needs to talk to the vault. One per window. */
export type AppContext = {
  readonly session: VaultSession;
  readonly logger: Logger;
  readonly clock: ClockPort;
  readonly ids: IdGenerator;
  readonly onVaultChanged: (onChange: (paths: readonly string[]) => void) => Promise<() => void>;
  readonly onVaultOpened: (onOpen: () => void) => Promise<() => void>;
};

let context: Promise<AppContext> | undefined;

const build = async (): Promise<AppContext> => {
  const logger = createLogger();
  const clock = createSystemClock();
  const env = await vaultControlApi.env();
  const ids = createRandomIds(clock);
  const session = createVaultSession({
    control: vaultControlApi,
    fs: createTauriFs(),
    env,
    clock,
    ids,
    logger,
  });
  return {
    session,
    logger,
    clock,
    ids,
    onVaultChanged: vaultControlApi.onChanged,
    onVaultOpened: vaultControlApi.onOpened,
  };
};

/** The window's context, created on first use. */
export const getAppContext = (): Promise<AppContext> => {
  context ??= build();
  return context;
};
