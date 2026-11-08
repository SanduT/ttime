import { currentTotals, DEFAULT_SETTINGS, formatTimestamp, type LocalDate } from '@ttime/core';
import { useMemo } from 'react';

import { useNow } from '../../../shared/hooks/use-now';
import { useVaultStore } from '../../../shared/store/vault-store';
import { periodStart, type ProjectDay, projectDays } from '../lib/project-entries';
import { useProjectsStore } from '../store/projects-store';

/** The selected period of project `id`: its days (newest first) and its date range. */
export const useProjectDays = (
  id: string,
): { readonly days: readonly ProjectDay[]; readonly from: LocalDate; readonly to: LocalDate } => {
  const snapshot = useVaultStore((state) => state.snapshot);
  const period = useProjectsStore((state) => state.period);
  const now = useNow();
  return useMemo(() => {
    const today = now.toPlainDate().toString();
    if (snapshot === null) {
      return { days: [], from: today, to: today };
    }
    const settings = snapshot.config?.settings ?? DEFAULT_SETTINGS;
    const totals = currentTotals({ entries: [], running: null, now, settings });
    const running =
      snapshot.running === null ? [] : [{ ...snapshot.running, end: formatTimestamp(now) }];
    const entries = [...[...snapshot.days.values()].flatMap((day) => day.entries), ...running];
    const start = periodStart(period, totals.today.date, totals.week.start);
    const days = projectDays(entries, id, start);
    return { days, from: start ?? days.at(-1)?.date ?? totals.today.date, to: totals.today.date };
  }, [snapshot, id, period, now]);
};
