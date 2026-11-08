import { timestampFromEpoch } from '@ttime/core';
import { useEffect } from 'react';

import { monitorApi } from '../../../shared/bridge/monitor-api';
import { windowApi } from '../../../shared/bridge/window-api';
import { getAppContext } from '../../../shared/lib/app-context';
import { runAction } from '../../../shared/lib/run-action';
import { servicesFor } from '../../../shared/lib/vault-services';
import { useVaultStore } from '../../../shared/store/vault-store';
import { type MonitorPrompt, useQuickbarStore } from '../store/quickbar-store';

/**
 * Handles the Rust monitors (PRD 6.5): idle time and a forgotten timer open a prompt in the
 * quick bar; auto-stop stops the timer at the last activity.
 */
export const useMonitors = (): void => {
  const vault = useVaultStore((state) => state.vault);
  const setPrompt = useQuickbarStore((state) => state.setPrompt);

  useEffect(() => {
    if (vault === null) {
      return;
    }
    const ask = (prompt: MonitorPrompt): void => {
      setPrompt(prompt);
      void runAction('Show the monitor prompt', () => windowApi.showQuickbar('prompt'));
    };
    const autoStop = (at: number): void => {
      void runAction('Auto-stop', async () => {
        const { clock } = await getAppContext();
        const { timer } = await servicesFor(vault);
        await timer.stop({ at: timestampFromEpoch(at, clock.now().timeZoneId) });
      });
    };
    let active = true;
    const stops: (() => void)[] = [];
    void runAction('Listen for monitors', async () => {
      const listeners = await Promise.all([
        monitorApi.onIdle((since, returned) => {
          ask({ kind: 'idle', since, returned });
        }),
        monitorApi.onForgotten((hours, lastActivity) => {
          ask({ kind: 'forgotten', hours, lastActivity });
        }),
        monitorApi.onAutoStop(autoStop),
      ]);
      stops.push(...listeners);
      if (!active) {
        for (const stop of stops) {
          stop();
        }
      }
    });
    return () => {
      active = false;
      for (const stop of stops) {
        stop();
      }
    };
  }, [vault, setPrompt]);
};
