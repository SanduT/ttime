import { createQuickActions, createTimerService, type Vault } from '@ttime/core';

import { getAppContext } from './app-context';

/** The core services a window uses to change the running entry. */
export type VaultServices = {
  readonly quick: ReturnType<typeof createQuickActions>;
  readonly timer: ReturnType<typeof createTimerService>;
};

/** Core services bound to `vault` and this window's clock, IDs and logger. */
export const servicesFor = async (vault: Vault): Promise<VaultServices> => {
  const { clock, ids, logger } = await getAppContext();
  return {
    quick: createQuickActions({ vault, clock, ids, logger }),
    timer: createTimerService({ vault, ids, logger }),
  };
};
