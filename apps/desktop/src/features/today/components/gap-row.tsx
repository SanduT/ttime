import { formatElapsed, type Gap } from '@ttime/core';
import { useState } from 'react';

import { useVaultAction } from '../../../shared/hooks/use-vault-action';
import { clockOf } from '../../../shared/lib/display';
import { EntryForm, type EntryValues } from './entry-form';

/** An untracked stretch of working hours with a "Fill gap" action. */
export const GapRow = ({ gap, date }: { readonly gap: Gap; readonly date: string }) => {
  const [filling, setFilling] = useState(false);
  const act = useVaultAction();
  if (filling) {
    const save = async (values: EntryValues) =>
      (await act('Fill gap', ({ entries }) => entries.create(values))) !== undefined;
    return (
      <li>
        <EntryForm
          date={date}
          initial={{
            description: '',
            project: '',
            start: clockOf(gap.start),
            end: clockOf(gap.end),
          }}
          submitLabel="Add entry"
          onSubmit={save}
          onCancel={() => {
            setFilling(false);
          }}
        />
      </li>
    );
  }
  return (
    <li className="flex items-center gap-3 rounded-md border border-dashed border-(--color-border) px-2 py-1 text-xs text-(--color-text-muted)">
      <span className="w-24 tabular-nums">
        {clockOf(gap.start)} – {clockOf(gap.end)}
      </span>
      <span className="flex-1">Untracked {formatElapsed(gap.seconds)}</span>
      <button
        type="button"
        className="rounded px-2 py-0.5 font-medium text-(--color-accent) hover:bg-(--color-control)"
        onClick={() => {
          setFilling(true);
        }}
      >
        Fill gap
      </button>
    </li>
  );
};
