import {
  createQuickActions,
  createTimerService,
  type QuickPlan,
  type RecentEntry,
  type RunningPatch,
  type TTimeError,
  type Vault,
} from '@ttime/core';
import { useMemo } from 'react';

import { windowApi } from '../../../shared/bridge/window-api';
import { getAppContext } from '../../../shared/lib/app-context';
import { runAction } from '../../../shared/lib/run-action';
import { useVaultStore } from '../../../shared/store/vault-store';
import { useQuickbarStore } from '../store/quickbar-store';

/** Quick bar actions. Results and errors are shown in the quick bar, which stays open. */
export type QuickbarActions = {
  /** `trim` shortens earlier entries a backdated start overlaps. */
  readonly start: (plan: QuickPlan, trim?: boolean) => Promise<void>;
  readonly note: (plan: QuickPlan) => Promise<void>;
  readonly continueRecent: (item: RecentEntry) => Promise<void>;
  readonly stop: () => Promise<void>;
  /** Pauses the running entry, or resumes the last one when nothing runs. */
  readonly pauseResume: () => Promise<void>;
  readonly editRunning: (patch: RunningPatch) => Promise<void>;
  readonly openMain: () => Promise<void>;
  readonly close: () => Promise<void>;
};

type Services = {
  readonly quick: ReturnType<typeof createQuickActions>;
  readonly timer: ReturnType<typeof createTimerService>;
};

const services = async (vault: Vault): Promise<Services> => {
  const { clock, ids, logger } = await getAppContext();
  return {
    quick: createQuickActions({ vault, clock, ids, logger }),
    timer: createTimerService({ vault, ids, logger }),
  };
};

const canTrim = (error: TTimeError | null): boolean =>
  error?.code === 'timer.backdate_overlap' && error.details['trimmable'] === true;

/** Binds the actions to the window's vault and running state. */
export const useQuickbarActions = (): QuickbarActions => {
  const vault = useVaultStore((state) => state.vault);
  const running = useVaultStore((state) => state.snapshot?.running ?? null);
  const { showResult, enterNoteMode, showError } = useQuickbarStore.getState();

  return useMemo(() => {
    const act = <T>(
      label: string,
      action: (s: Services) => Promise<T>,
      trimPlan: QuickPlan | null = null,
    ): Promise<T | undefined> =>
      runAction(label, async () => (vault === null ? undefined : action(await services(vault))), {
        onError: (message, error) => {
          const trimmable = canTrim(error);
          showError({ message, trimmable, trim: trimmable ? trimPlan : null });
        },
      });

    return {
      start: async (plan, trim = false) => {
        const options = trim ? { onConflict: 'trim' as const } : {};
        const result = await act('Start', (s) => s.quick.start(plan, options), plan);
        if (result !== undefined) {
          showResult({ kind: 'started', entry: result.started, stopped: result.stopped });
        }
      },
      note: async (plan) => {
        if ((await act('Add note', (s) => s.quick.note(plan))) !== undefined) {
          enterNoteMode();
        }
      },
      continueRecent: async (item) => {
        const result = await act('Continue', (s) => s.quick.continueRecent(item));
        if (result !== undefined) {
          showResult({ kind: 'started', entry: result.started, stopped: result.stopped });
        }
      },
      stop: async () => {
        const result = await act('Stop', (s) => s.timer.stop().then((entry) => ({ entry })));
        if (result !== undefined) {
          showResult({ kind: 'stopped', entry: result.entry });
        }
      },
      pauseResume: async () => {
        if (running === null) {
          const result = await act('Resume', (s) => s.timer.resume());
          if (result !== undefined) {
            showResult({ kind: 'started', entry: result.started, stopped: result.stopped });
          }
          return;
        }
        const result = await act('Pause', (s) => s.timer.pause().then((entry) => ({ entry })));
        if (result !== undefined) {
          showResult({ kind: 'stopped', entry: result.entry });
        }
      },
      editRunning: async (patch) => {
        const entry = await act('Edit running entry', (s) => s.timer.editRunning(patch));
        if (entry !== undefined) {
          showResult({ kind: 'edited', entry });
        }
      },
      openMain: async () => {
        await runAction('Open ttime', async () => {
          await windowApi.hideQuickbar();
          await windowApi.showMain();
        });
      },
      close: async () => {
        await runAction('Close quick bar', () => windowApi.hideQuickbar());
      },
    };
  }, [vault, running, showResult, enterNoteMode, showError]);
};
