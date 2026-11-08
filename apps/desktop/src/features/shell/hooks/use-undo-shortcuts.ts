import { useEffect } from 'react';

import { useVaultAction } from '../../../shared/hooks/use-vault-action';
import { useToastStore } from '../../../shared/store/toast-store';

/** True when the key goes to a text field, where ⌘Z edits the text instead. */
const inTextField = (target: EventTarget | null): boolean =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

/** ⌘Z undoes and ⇧⌘Z redoes this app's last change, through changelog batches. */
export const useUndoShortcuts = (): void => {
  const act = useVaultAction();
  const toast = useToastStore((state) => state.push);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (!event.metaKey || event.key.toLowerCase() !== 'z' || inTextField(event.target)) {
        return;
      }
      event.preventDefault();
      const redo = event.shiftKey;
      void act(redo ? 'Redo' : 'Undo', async ({ undo }) => {
        const state = await undo.state();
        const target = redo ? state.redo : state.undo;
        if (target === null) {
          toast(redo ? 'Nothing to redo.' : 'Nothing to undo.');
          return;
        }
        await undo.undo(target.batch);
        toast(redo ? 'Redone.' : 'Undone.');
      });
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [act, toast]);
};
