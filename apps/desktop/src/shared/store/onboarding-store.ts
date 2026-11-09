import { create } from 'zustand';

/** Onboarding steps: welcome, vault, shortcut, menu bar. */
export const ONBOARDING_STEPS = 4;

type OnboardingState = {
  /** The flow shows instead of the main window while active. */
  readonly active: boolean;
  readonly step: number;
  readonly start: () => void;
  readonly go: (step: number) => void;
  readonly finish: () => void;
};

/** The first-run flow, also replayed from Settings. */
export const useOnboardingStore = create<OnboardingState>()((set) => ({
  active: false,
  step: 0,
  start: () => {
    set({ active: true, step: 0 });
  },
  go: (step) => {
    set({ step: Math.max(0, Math.min(ONBOARDING_STEPS - 1, step)) });
  },
  finish: () => {
    set({ active: false, step: 0 });
  },
}));
