import type { RecentEntry } from '@ttime/core';
import { useMemo } from 'react';

import { windowApi } from '../../../shared/bridge/window-api';
import { runAction } from '../../../shared/lib/run-action';
import { servicesFor, type VaultServices } from '../../../shared/lib/vault-services';
import { useVaultStore } from '../../../shared/store/vault-store';

/** Popover buttons. Timer actions keep the popover open so the result is visible. */
export type PopoverActions = {
  readonly stop: () => Promise<void>;
  /** Continues the last entry as a new one. */
  readonly resume: () => Promise<void>;
  readonly discard: () => Promise<void>;
  readonly continueRecent: (item: RecentEntry) => Promise<void>;
  /** Opens the quick bar in note mode. */
  readonly addNote: () => Promise<void>;
  /** Opens the quick bar to start or switch. */
  readonly newEntry: () => Promise<void>;
  readonly openMain: () => Promise<void>;
  readonly quit: () => Promise<void>;
};

/** Binds the popover buttons to the window's vault. */
export const usePopoverActions = (): PopoverActions => {
  const vault = useVaultStore((state) => state.vault);

  return useMemo(() => {
    const act = async (label: string, action: (s: VaultServices) => Promise<unknown>) => {
      await runAction(label, async () => {
        if (vault !== null) {
          await action(await servicesFor(vault));
        }
      });
    };
    const leave = async (label: string, next: () => Promise<null>) => {
      await runAction(label, async () => {
        await windowApi.hidePopover();
        await next();
      });
    };
    return {
      stop: () => act('Stop', (s) => s.timer.stop()),
      resume: () => act('Resume', (s) => s.timer.resume()),
      discard: () => act('Discard', (s) => s.timer.discard()),
      continueRecent: (item) => act('Continue', (s) => s.quick.continueRecent(item)),
      addNote: () => leave('Add note', () => windowApi.showQuickbar('note')),
      newEntry: () => leave('New entry', () => windowApi.showQuickbar('new')),
      openMain: () => leave('Open ttime', () => windowApi.showMain()),
      quit: async () => {
        await runAction('Quit', () => windowApi.quit());
      },
    };
  }, [vault]);
};
