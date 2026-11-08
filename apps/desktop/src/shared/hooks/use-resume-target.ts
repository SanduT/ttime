import { type Entry, latestEntry } from '@ttime/core';
import { useMemo } from 'react';

import { resumeLabel } from '../lib/display';
import { useVaultStore } from '../store/vault-store';

/** What Resume would continue among the loaded days, with its label; null when nothing. */
export const useResumeTarget = (): { readonly entry: Entry; readonly label: string } | null => {
  const snapshot = useVaultStore((state) => state.snapshot);
  return useMemo(() => {
    if (snapshot === null) {
      return null;
    }
    const entry = latestEntry([...snapshot.days.values()].flatMap((day) => day.entries));
    return entry === null ? null : { entry, label: resumeLabel(entry, snapshot.projects) };
  }, [snapshot]);
};
