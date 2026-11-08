import { create } from 'zustand';

import type { Period } from '../lib/project-entries';

/** Which editor is open: a project or client ID, `new`, or nothing. */
type Editor =
  | { readonly kind: 'project'; readonly id: string | null }
  | { readonly kind: 'client'; readonly id: string | null }
  | null;

type ProjectsState = {
  readonly selected: string | null;
  readonly period: Period;
  readonly showArchived: boolean;
  readonly editor: Editor;
  readonly select: (id: string | null) => void;
  readonly setPeriod: (period: Period) => void;
  readonly toggleArchived: () => void;
  readonly edit: (editor: Editor) => void;
};

/** The Projects view state: list filter, selected project and open editor. */
export const useProjectsStore = create<ProjectsState>()((set) => ({
  selected: null,
  period: 'month',
  showArchived: false,
  editor: null,
  select: (selected) => {
    set({ selected });
  },
  setPeriod: (period) => {
    set({ period });
  },
  toggleArchived: () => {
    set((state) => ({ showArchived: !state.showArchived }));
  },
  edit: (editor) => {
    set({ editor });
  },
}));
