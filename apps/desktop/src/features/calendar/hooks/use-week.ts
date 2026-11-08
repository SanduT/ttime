import { DEFAULT_SETTINGS, type Entry, presetRange, weekView } from '@ttime/core';
import { useMemo } from 'react';

import { useNow } from '../../../shared/hooks/use-now';
import { useVaultStore } from '../../../shared/store/vault-store';
import { useCalendarStore } from '../store/calendar-store';

/** The shown week's layout, its first day, and finished entries by ID for gestures. */
export const useWeek = () => {
  const snapshot = useVaultStore((state) => state.snapshot);
  const anchor = useCalendarStore((state) => state.anchor);
  const now = useNow(30_000);
  const settings = snapshot?.config?.settings ?? DEFAULT_SETTINGS;
  const start = presetRange('this-week', anchor, settings.weekStartsOn).from;
  const entries = useMemo(
    () => [...(snapshot?.days.values() ?? [])].flatMap((day) => day.entries),
    [snapshot],
  );
  const byId = useMemo(() => new Map<string, Entry>(entries.map((e) => [e.id, e])), [entries]);
  const week = useMemo(
    () =>
      weekView({
        start,
        entries,
        running: snapshot?.running ?? null,
        now,
        workingHours: settings.workingHours,
      }),
    [start, entries, snapshot?.running, now, settings.workingHours],
  );
  return { start, week, byId, zone: now.timeZoneId };
};
