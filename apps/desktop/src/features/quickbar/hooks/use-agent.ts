import { useEffect, useMemo } from 'react';

import { type TrayActionKind, windowApi } from '../../../shared/bridge/window-api';
import { useResumeTarget } from '../../../shared/hooks/use-resume-target';
import { runAction } from '../../../shared/lib/run-action';
import { servicesFor } from '../../../shared/lib/vault-services';
import { useVaultStore } from '../../../shared/store/vault-store';
import { toRunningSummary } from '../lib/running-summary';

/** Pushes the running entry to Rust for the menu bar after every change. */
const usePushRunning = (): void => {
  const running = useVaultStore((state) => state.snapshot?.running ?? null);
  const projects = useVaultStore((state) => state.snapshot?.projects);
  const summary = useMemo(
    () => toRunningSummary(running, projects ?? new Map()),
    [running, projects],
  );
  const start = summary?.startEpochSeconds ?? null;
  const projectName = summary?.projectName ?? null;
  const color = summary?.color ?? null;
  const resume = useResumeTarget()?.label ?? null;

  useEffect(() => {
    const next =
      start === null || projectName === null || color === null
        ? null
        : { startEpochSeconds: start, projectName, color };
    void runAction('Update menu bar', () => windowApi.setRunning(next, resume));
  }, [start, projectName, color, resume]);
};

/** Carries out Stop and Resume from the tray menu through the core. */
const useTrayActions = (): void => {
  const vault = useVaultStore((state) => state.vault);

  useEffect(() => {
    if (vault === null) {
      return;
    }
    const act = (action: TrayActionKind): void => {
      void runAction(`Tray ${action}`, async () => {
        const { timer } = await servicesFor(vault);
        await (action === 'stop' ? timer.stop() : timer.resume());
      });
    };
    let active = true;
    let unlisten: (() => void) | undefined;
    void runAction('Listen for tray actions', async () => {
      const stop = await windowApi.onTrayAction(act);
      if (active) {
        unlisten = stop;
      } else {
        stop();
      }
    });
    return () => {
      active = false;
      unlisten?.();
    };
  }, [vault]);
};

/**
 * The agent role (ARCHITECTURE 7.1): keeps the menu bar current after every change, local or
 * external (the snapshot reloads on `vault:changed`), and handles the tray menu's timer actions.
 */
export const useAgent = (): void => {
  usePushRunning();
  useTrayActions();
};
