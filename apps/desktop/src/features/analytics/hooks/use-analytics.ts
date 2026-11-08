import { analytics, type DateRange, DEFAULT_SETTINGS, presetRange, shiftRange } from '@ttime/core';
import { useMemo } from 'react';

import { useNow } from '../../../shared/hooks/use-now';
import { useVaultStore } from '../../../shared/store/vault-store';
import { useAnalyticsStore } from '../store/analytics-store';

/** The selected period's range and its analytics, with the vault's default rounding. */
export const useAnalytics = () => {
  const snapshot = useVaultStore((state) => state.snapshot);
  const { period, offset, custom } = useAnalyticsStore();
  const now = useNow();
  const today = now.toPlainDate().toString();
  const settings = snapshot?.config?.settings ?? DEFAULT_SETTINGS;
  const base: DateRange =
    period === 'custom'
      ? (custom ?? { from: today, to: today })
      : presetRange(period, today, settings.weekStartsOn);
  const range = shiftRange(base, period, offset);
  const result = useMemo(
    () =>
      analytics({
        entries: [...(snapshot?.days.values() ?? [])].flatMap((day) => day.entries),
        from: range.from,
        to: range.to,
        project: null,
        projects: snapshot?.projects ?? new Map(),
        clients: snapshot?.clients ?? new Map(),
        timeZone: now.timeZoneId,
        dayStartsAt: settings.dayStartsAt,
        rounding: settings.rounding,
      }),
    [snapshot, range.from, range.to, now.timeZoneId, settings.dayStartsAt, settings.rounding],
  );
  return { range, result, rounding: settings.rounding };
};
