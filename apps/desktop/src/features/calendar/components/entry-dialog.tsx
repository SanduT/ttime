import { type Entry, toZoned } from '@ttime/core';

import { useVaultAction } from '../../../shared/hooks/use-vault-action';
import { clockOf } from '../../../shared/lib/display';
import { useToastStore } from '../../../shared/store/toast-store';
import { Button } from '../../../shared/ui/button';
import { Dialog } from '../../../shared/ui/dialog';
import { draftOf, EntryForm, type EntryValues } from '../../today';
import { type CalendarEditor, useCalendarStore } from '../store/calendar-store';

type Props = {
  readonly editor: CalendarEditor;
  readonly byId: ReadonlyMap<string, Entry>;
  readonly zone: string;
};

/** The form's starting values: the entry's, or the dragged-out times with no project yet. */
const draftFor = (editor: CalendarEditor, entry: Entry | undefined) => {
  if (entry !== undefined) {
    return { start: entry.start, initial: draftOf(entry) };
  }
  if (editor.kind === 'create') {
    const initial = {
      description: '',
      project: '',
      start: clockOf(editor.start),
      end: clockOf(editor.end),
    };
    return { start: editor.start, initial };
  }
  return null;
};

/** Edits a clicked entry (project, description, times, delete) or names a dragged-out block. */
export const EntryDialog = ({ editor, byId, zone }: Props) => {
  const edit = useCalendarStore((state) => state.edit);
  const close = () => {
    edit(null);
  };
  const act = useVaultAction();
  const toast = useToastStore((state) => state.push);
  const entry = editor.kind === 'edit' ? byId.get(editor.id) : undefined;
  const draft = draftFor(editor, entry);
  if (draft === null) {
    return null;
  }
  const date = toZoned(draft.start, zone).toPlainDate().toString();
  const save = async (values: EntryValues) =>
    (await act(entry === undefined ? 'Add entry' : 'Save entry', ({ entries }) =>
      entry === undefined ? entries.create(values) : entries.update(entry.id, values),
    )) !== undefined;
  const remove = async () => {
    if (
      entry !== undefined &&
      (await act('Delete entry', ({ entries }) => entries.delete(entry.id))) !== undefined
    ) {
      toast('Moved to the trash. ⌘Z restores it.');
      close();
    }
  };
  return (
    <Dialog title={entry === undefined ? 'New entry' : 'Edit entry'} onClose={close}>
      <EntryForm
        date={date}
        initial={draft.initial}
        submitLabel={entry === undefined ? 'Add' : 'Save'}
        onSubmit={save}
        onCancel={close}
        extra={
          entry === undefined ? null : (
            <Button className="text-(--color-danger)" onClick={() => void remove()}>
              Delete
            </Button>
          )
        }
      />
    </Dialog>
  );
};
