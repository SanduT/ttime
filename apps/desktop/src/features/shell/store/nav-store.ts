import { create } from 'zustand';

/** Main window views (PRD 6.3). Calendar and Analytics come with later steps. */
export type View = 'today' | 'projects' | 'issues' | 'settings';

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
