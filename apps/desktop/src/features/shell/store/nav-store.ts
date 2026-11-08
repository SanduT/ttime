import { create } from 'zustand';

/** Main window views (PRD 6.3). Analytics comes with step 10. */
export type View = 'today' | 'calendar' | 'projects' | 'issues' | 'settings';

type NavState = {
  readonly view: View;
  readonly go: (view: View) => void;
};

/** Which main window view is shown. */
export const useNavStore = create<NavState>()((set) => ({
  view: 'today',
  go: (view) => {
    set({ view });
  },
}));
