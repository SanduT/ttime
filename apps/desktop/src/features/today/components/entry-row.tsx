import { type Entry, formatElapsed, secondsBetween } from '@ttime/core';
import { useState } from 'react';

import { useVaultAction } from '../../../shared/hooks/use-vault-action';
import { clockOf, FALLBACK_COLOR } from '../../../shared/lib/display';
import { useToastStore } from '../../../shared/store/toast-store';
import { useVaultStore } from '../../../shared/store/vault-store';
import { Button } from '../../../shared/ui/button';
import { ProjectDot } from '../../../shared/ui/project-dot';
import { draftOf } from '../lib/entry-draft';
import { EntryForm, type EntryValues } from './entry-form';
import { Notes } from './notes';

const ROW =
  'flex min-h-11 w-full items-center gap-3.5 rounded-[10px] px-3 py-2 text-left text-[13px] transition-colors hover:bg-(--color-hover)';

/** A finished entry. Click or Enter edits it in place; the editor can delete it. */
export const EntryRow = ({ entry, date }: { readonly entry: Entry; readonly date: string }) => {
  const [editing, setEditing] = useState(false);
  const project = useVaultStore((state) => state.snapshot?.projects.get(entry.project));
  const act = useVaultAction();
  const toast = useToastStore((state) => state.push);

  if (editing) {
    const save = async (values: EntryValues) =>
      (await act('Save entry', ({ entries }) => entries.update(entry.id, values))) !== undefined;
    const remove = async () => {
      if ((await act('Delete entry', ({ entries }) => entries.delete(entry.id))) !== undefined) {
        toast('Moved to the trash. ⌘Z restores it.');
      }
    };
    return (
      <li>
        <EntryForm
          date={date}
          initial={draftOf(entry)}
          submitLabel="Save"
          onSubmit={save}
          onCancel={() => {
            setEditing(false);
          }}
          extra={
            <Button className="text-(--color-danger)" onClick={() => void remove()}>
              Delete
            </Button>
          }
        />
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        className={ROW}
        onClick={() => {
          setEditing(true);
        }}
      >
        <span className="w-24 shrink-0 text-xs text-(--color-text-muted) tabular-nums">
          {clockOf(entry.start)} – {clockOf(entry.end)}
        </span>
        <ProjectDot color={project?.color ?? FALLBACK_COLOR} />
        <span className="min-w-0 flex-1 truncate font-medium">
          {entry.description === '' ? (
            <span className="text-(--color-text-muted)">(no description)</span>
          ) : (
            entry.description
          )}
        </span>
        <span className="text-xs text-(--color-text-muted)">{project?.name ?? entry.project}</span>
        <span className="w-14 text-right font-medium tabular-nums">
          {formatElapsed(secondsBetween(entry.start, entry.end))}
        </span>
      </button>
      <Notes notes={entry.notes} />
    </li>
  );
};
