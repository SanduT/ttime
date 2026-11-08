import {
  createClientService,
  createEntryService,
  createProjectService,
  createQuickActions,
  createTimerService,
  createUndoService,
  type Vault,
} from '@ttime/core';

import { getAppContext } from './app-context';

/** The core services a window uses to change the vault. */
export type VaultServices = {
  readonly quick: ReturnType<typeof createQuickActions>;
  readonly timer: ReturnType<typeof createTimerService>;
  readonly entries: ReturnType<typeof createEntryService>;
  readonly projects: ReturnType<typeof createProjectService>;
  readonly clients: ReturnType<typeof createClientService>;
  readonly undo: ReturnType<typeof createUndoService>;
};

/** Core services bound to `vault` and this window's clock, IDs and logger. */
export const servicesFor = async (vault: Vault): Promise<VaultServices> => {
  const { clock, ids, logger } = await getAppContext();
  return {
    quick: createQuickActions({ vault, clock, ids, logger }),
    timer: createTimerService({ vault, ids, logger }),
    entries: createEntryService({ vault, ids, logger }),
    projects: createProjectService({ vault, logger }),
    clients: createClientService({ vault, logger }),
    undo: createUndoService({ vault, logger }),
  };
};
