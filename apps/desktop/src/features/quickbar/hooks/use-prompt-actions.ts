import { type IdleChoice, timestampFromEpoch } from '@ttime/core';

import { windowApi } from '../../../shared/bridge/window-api';
import { getAppContext } from '../../../shared/lib/app-context';
import { runAction } from '../../../shared/lib/run-action';
import { servicesFor } from '../../../shared/lib/vault-services';
import { useVaultStore } from '../../../shared/store/vault-store';
import { useQuickbarStore } from '../store/quickbar-store';

/** Answers to the monitor prompt. Each clears the prompt and hides the quick bar when done. */
export const usePromptActions = () => {
  const vault = useVaultStore((state) => state.vault);
  const setPrompt = useQuickbarStore((state) => state.setPrompt);

  const finish = async (): Promise<void> => {
    setPrompt(null);
    await windowApi.hideQuickbar();
  };

  const act = (label: string, change: (zone: string) => Promise<unknown>): void => {
    void runAction(label, async () => {
      const { clock } = await getAppContext();
      await change(clock.now().timeZoneId);
      await finish();
    });
  };

  return {
    /** Leaves everything as it is. */
    keep: () => {
      void runAction('Keep time', finish);
    },
    resolveIdle: (choice: IdleChoice, since: number, returned: number, project?: string) => {
      act(`Idle ${choice}`, async (zone) => {
        if (vault === null) {
          return;
        }
        const { idle } = await servicesFor(vault);
        await idle.resolve({
          choice,
          idleSince: timestampFromEpoch(since, zone),
          returnedAt: timestampFromEpoch(returned, zone),
          ...(project === undefined ? {} : { project }),
        });
      });
    },
    /** Stops at `at` (seconds since the epoch), or now when null. */
    stopAt: (at: number | null) => {
      act('Stop forgotten timer', async (zone) => {
        if (vault === null) {
          return;
        }
        const { timer } = await servicesFor(vault);
        await timer.stop(at === null ? {} : { at: timestampFromEpoch(at, zone) });
      });
    },
  };
};
