import type { DateRange, PeriodPreset } from '@ttime/core';
import { create } from 'zustand';

/** How the period is chosen: a preset around today, or custom dates. */
export type AnalyticsPeriod = PeriodPreset | 'custom';

type AnalyticsState = {
  readonly period: AnalyticsPeriod;
  /** Periods back (negative) or forward from the preset; ← and → change it. */
  readonly offset: number;
  /** The range for `custom`, as last set. */
  readonly custom: DateRange | null;
  /** The project drilled into, or null for the overview. */
  readonly project: string | null;
  readonly choose: (period: AnalyticsPeriod, custom?: DateRange) => void;
  readonly shift: (steps: number) => void;
  readonly drill: (project: string | null) => void;
};

/** The Analytics period and drill-down. */
export const useAnalyticsStore = create<AnalyticsState>()((set) => ({
  period: 'this-week',
  offset: 0,
  custom: null,
  project: null,
  choose: (period, custom) => {
    set((state) => ({ period, offset: 0, custom: custom ?? state.custom }));
  },
  shift: (steps) => {
    set((state) => ({ offset: state.offset + steps }));
  },
  drill: (project) => {
    set({ project });
  },
}));
