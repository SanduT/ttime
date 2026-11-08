import { planQuickInput, type QuickContext } from '@ttime/core';
import { type KeyboardEvent, useMemo } from 'react';

import { type ActionId, keyIntent } from '../lib/actions';
import { buildItems, type QuickItem } from '../lib/quick-items';
import { completeProject } from '../lib/tokens';
import { useQuickbarStore } from '../store/quickbar-store';
import { useActionHandlers } from './use-action-handlers';
import { useQuickbarActions } from './use-quickbar-actions';

/** What the quick bar view renders and how it reacts to selection and keys. */
export type QuickbarController = {
  readonly items: readonly QuickItem[];
  /** The highlighted row: the stored one if still listed, else the first. */
  readonly value: string;
  readonly select: (item: QuickItem) => void;
  readonly run: (id: ActionId) => void;
  /** Capture-phase key handler, so shortcuts win over the list's own Enter. */
  readonly onKeyDownCapture: (event: KeyboardEvent) => void;
};

const useItems = (context: QuickContext): readonly QuickItem[] => {
  const { text, panel, noteMode, error } = useQuickbarStore();
  return useMemo(() => {
    const plan = planQuickInput(text, context);
    const start: QuickItem[] = plan.text === '' ? [] : [{ kind: 'start', id: 'start', plan }];
    const base =
      noteMode || (panel === 'done' && plan.text === '') ? start : buildItems(text, context);
    const trim = error?.trim ?? null;
    return trim === null ? base : [{ kind: 'trim', id: 'trim', plan: trim }, ...base];
  }, [text, panel, noteMode, error, context]);
};

/** Wires list selection, ⌘K actions and shortcuts to the quick bar actions. */
export const useQuickbarController = (
  context: QuickContext,
  focus: () => void,
): QuickbarController => {
  const { text, panel, noteMode, selected, setText } = useQuickbarStore();
  const actions = useQuickbarActions();
  const items = useItems(context);
  const plan = useMemo(() => planQuickInput(text, context), [text, context]);
  const run = useActionHandlers(plan, context.running, focus);
  const value = items.some((item) => item.id === selected) ? selected : (items[0]?.id ?? '');
  const current = items.find((item) => item.id === value);

  const select = (item: QuickItem): void => {
    switch (item.kind) {
      case 'start':
        void (noteMode ? actions.note(item.plan) : actions.start(item.plan));
        return;
      case 'trim':
        void actions.start(item.plan, true);
        return;
      case 'project':
        setText(completeProject(text, item.project.id));
        return;
      case 'create-project':
        setText(completeProject(text, item.name));
        return;
      case 'recent':
        void actions.continueRecent(item.item);
    }
  };

  const onKeyDownCapture = (event: KeyboardEvent): void => {
    const intent = keyIntent(event, {
      panel,
      noteMode,
      empty: text.trim() === '',
      onRecent: current?.kind === 'recent',
    });
    if (intent === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (intent.kind === 'action') {
      run(intent.id);
    } else if (intent.kind === 'close') {
      void actions.close();
    } else if (current?.kind === 'recent') {
      setText(`${current.item.description} @${current.item.project} `);
    }
  };

  return { items, value, select, run, onKeyDownCapture };
};
