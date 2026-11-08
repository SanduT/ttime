import { addDays, type DayView, dayView, DEFAULT_SETTINGS } from '@ttime/core';
import { useMemo } from 'react';

import { useNow } from '../../../shared/hooks/use-now';
import { useVaultStore } from '../../../shared/store/vault-store';
import { useDayStore } from '../store/day-store';

/** The Today model of the selected day, refreshed every minute and on every vault change. */
export const useDayView = (): DayView | null => {
  const date = useDayStore((state) => state.date);
  const snapshot = useVaultStore((state) => state.snapshot);
  const now = useNow();
  return useMemo(() => {
    if (snapshot === null) {
      return null;
    }
    const entries = [addDays(date, -1), date].flatMap(
      (day) => snapshot.days.get(day)?.entries ?? [],
    );
    return dayView({
      date,
      entries,
      running: snapshot.running,
      now,
      settings: snapshot.config?.settings ?? DEFAULT_SETTINGS,
    });
  }, [date, snapshot, now]);
};
