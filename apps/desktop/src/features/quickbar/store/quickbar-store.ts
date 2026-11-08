import type { Entry, QuickPlan, RunningEntry } from '@ttime/core';
import { create } from 'zustand';

import type { QuickbarMode } from '../../../shared/bridge/window-api';

/** What the quick bar body shows. `done` confirms the last action. */
export type QuickbarPanel = 'list' | 'actions' | 'edit' | 'done';

/** What the last action did, shown on the `done` panel. */
export type QuickResult =
  | { readonly kind: 'started'; readonly entry: RunningEntry; readonly stopped: Entry | null }
  | { readonly kind: 'stopped'; readonly entry: Entry | null }
  | { readonly kind: 'edited'; readonly entry: RunningEntry };

/**
 * A failed action, shown in place. `trimmable` when trimming earlier time would fix it; `trim`
 * is the start to retry with trimming, if the failed action was a start.
 */
type QuickError = {
  readonly message: string;
  readonly trimmable: boolean;
  readonly trim: QuickPlan | null;
};

type QuickbarState = {
  readonly text: string;
  readonly panel: QuickbarPanel;
  /** Enter adds a note; the list shows the running entry's notes. */
  readonly noteMode: boolean;
  /** The highlighted list row (cmdk value). */
  readonly selected: string;
  readonly result: QuickResult | null;
  readonly error: QuickError | null;
  /** Typing clears the error and leaves the `done` and `actions` panels. */
  readonly setText: (text: string) => void;
  readonly setPanel: (panel: QuickbarPanel) => void;
  readonly setSelected: (selected: string) => void;
  readonly showResult: (result: QuickResult) => void;
  readonly enterNoteMode: () => void;
  readonly showError: (error: QuickError) => void;
  readonly clearError: () => void;
  /** Resets the quick bar for a fresh `mode` each time it is shown. */
  readonly open: (mode: QuickbarMode) => void;
};

/** UI state of the quick bar. */
export const useQuickbarStore = create<QuickbarState>()((set) => ({
  text: '',
  panel: 'list',
  noteMode: false,
  selected: '',
  result: null,
  error: null,
  setText: (text) => {
    set((state) => ({
      text,
      error: null,
      panel: state.panel === 'edit' ? 'edit' : 'list',
    }));
  },
  setPanel: (panel) => {
    set({ panel, error: null });
  },
  setSelected: (selected) => {
    set({ selected });
  },
  showResult: (result) => {
    set({ result, panel: 'done', text: '', noteMode: false, error: null, selected: '' });
  },
  enterNoteMode: () => {
    set({ noteMode: true, panel: 'list', text: '', error: null, selected: '' });
  },
  showError: (error) => {
    set({ error, selected: '' });
  },
  clearError: () => {
    set({ error: null });
  },
  open: (mode) => {
    set({
      text: '',
      selected: '',
      result: null,
      error: null,
      panel: mode === 'edit-running' ? 'edit' : 'list',
      noteMode: mode === 'note',
    });
  },
}));
