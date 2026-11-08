import type { QuickPlan, RunningEntry } from '@ttime/core';

import type { ActionId } from '../lib/actions';
import { useQuickbarStore } from '../store/quickbar-store';
import { useQuickbarActions } from './use-quickbar-actions';

/** Runs a quick bar action by ID (shortcuts and the ⌘K panel). */
export const useActionHandlers = (
  plan: QuickPlan,
  running: RunningEntry | null,
  focus: () => void,
): ((id: ActionId) => void) => {
  const { panel, error, setPanel, enterNoteMode, clearError } = useQuickbarStore();
  const actions = useQuickbarActions();

  const back = (): void => {
    setPanel('list');
    requestAnimationFrame(focus);
  };

  const handlers: Readonly<Record<ActionId, () => void>> = {
    start: () => void actions.start(plan),
    note: () => {
      if (plan.text === '' && running !== null) {
        enterNoteMode();
      } else {
        void actions.note(plan);
      }
    },
    stop: () => void actions.stop(),
    edit: () => {
      if (running !== null) {
        setPanel('edit');
      }
    },
    'open-main': () => void actions.openMain(),
    actions: () => {
      if (panel === 'actions') {
        back();
      } else {
        setPanel('actions');
      }
    },
    close: () => {
      if (error !== null) {
        clearError();
      } else if (panel === 'edit' || panel === 'actions') {
        back();
      } else {
        void actions.close();
      }
    },
  };

  return (id) => {
    handlers[id]();
  };
};
