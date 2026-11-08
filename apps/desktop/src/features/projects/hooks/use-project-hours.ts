import { DEFAULT_SETTINGS, type ProjectHours, projectTotals } from '@ttime/core';
import { useMemo } from 'react';

import { useNow } from '../../../shared/hooks/use-now';
import { useVaultStore } from '../../../shared/store/vault-store';

/** Seconds per project this week, this month and all time, refreshed every minute. */
export const useProjectHours = (): ReadonlyMap<string, ProjectHours> => {
  const snapshot = useVaultStore((state) => state.snapshot);
  const now = useNow();
  return useMemo(
    () =>
      snapshot === null
        ? new Map()
        : projectTotals({
            entries: [...snapshot.days.values()].flatMap((day) => day.entries),
            running: snapshot.running,
            now,
            settings: snapshot.config?.settings ?? DEFAULT_SETTINGS,
          }),
    [snapshot, now],
  );
};
