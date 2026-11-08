import { addDays, type LocalDate } from '@ttime/core';
import { create } from 'zustand';

import { createSystemClock } from '../../../shared/adapters/system';

const clock = createSystemClock();
const today = (): LocalDate => clock.now().toPlainDate().toString();

type DayState = {
  readonly date: LocalDate;
  readonly step: (days: number) => void;
  readonly goToday: () => void;
};

/** The day the Today view shows. */
export const useDayStore = create<DayState>()((set) => ({
  date: today(),
  step: (days) => {
    set((state) => ({ date: addDays(state.date, days) }));
  },
  goToday: () => {
    set({ date: today() });
  },
}));
