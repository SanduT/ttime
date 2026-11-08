import { type QuickContext, recentEntries } from '@ttime/core';
import { useMemo } from 'react';

import { useVaultStore } from '../../../shared/store/vault-store';

/** Projects, the running entry and recent entries from the window's snapshot. */
export const useQuickContext = (): QuickContext => {
  const snapshot = useVaultStore((state) => state.snapshot);
  return useMemo(() => {
    if (snapshot === null) {
      return { projects: [], running: null, recent: [] };
    }
    const entries = [...snapshot.days.values()].flatMap((day) => day.entries);
    return {
      projects: [...snapshot.projects.values()],
      running: snapshot.running,
      recent: recentEntries(entries),
    };
  }, [snapshot]);
};
