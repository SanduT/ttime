import { useEffect, useMemo } from 'react';

import { windowApi } from '../../../shared/bridge/window-api';
import { runAction } from '../../../shared/lib/run-action';
import { useVaultStore } from '../../../shared/store/vault-store';
import { toRunningSummary } from '../lib/running-summary';

/**
 * The agent role (ARCHITECTURE 7.1): pushes the running entry to Rust for the menu bar after
 * every change, local or external, since the snapshot reloads on `vault:changed`.
 */
export const useAgent = (): void => {
  const running = useVaultStore((state) => state.snapshot?.running ?? null);
  const projects = useVaultStore((state) => state.snapshot?.projects);
  const summary = useMemo(
    () => toRunningSummary(running, projects ?? new Map()),
    [running, projects],
  );
  const start = summary?.start ?? null;
  const projectName = summary?.projectName ?? null;
  const color = summary?.color ?? null;

  useEffect(() => {
    const next =
      start === null || projectName === null || color === null
        ? null
        : { start, projectName, color };
    void runAction('Update menu bar', () => windowApi.setRunning(next));
  }, [start, projectName, color]);
};
