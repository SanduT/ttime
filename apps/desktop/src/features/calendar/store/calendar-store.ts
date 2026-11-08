import { addDays, type LocalDate, type Timestamp } from '@ttime/core';
import { create } from 'zustand';

import { createSystemClock } from '../../../shared/adapters/system';

const clock = createSystemClock();
const today = (): LocalDate => clock.now().toPlainDate().toString();

/** The entry dialog: editing an entry, or a new block dragged out on the grid. */
export type CalendarEditor =
  | { readonly kind: 'edit'; readonly id: string }
  | { readonly kind: 'create'; readonly start: Timestamp; readonly end: Timestamp };

type CalendarState = {
  /** Any date in the shown week. */
  readonly anchor: LocalDate;
  readonly editor: CalendarEditor | null;
  readonly step: (weeks: number) => void;
  readonly goToday: () => void;
  readonly edit: (editor: CalendarEditor | null) => void;
};

/** The week the calendar shows and its open dialog. */
export const useCalendarStore = create<CalendarState>()((set) => ({
  anchor: today(),
  editor: null,
  step: (weeks) => {
    set((state) => ({ anchor: addDays(state.anchor, weeks * 7) }));
  },
  goToday: () => {
    set({ anchor: today() });
  },
  edit: (editor) => {
    set({ editor });
  },
}));
