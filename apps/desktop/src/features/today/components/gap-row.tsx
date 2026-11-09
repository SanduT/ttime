import { formatElapsed, type Gap } from '@ttime/core';
import { useState } from 'react';

import { useVaultAction } from '../../../shared/hooks/use-vault-action';
import { clockOf } from '../../../shared/lib/display';
import { gapTimes } from '../lib/gap-draft';
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
          initial={{ description: '', project: '', ...gapTimes(gap) }}
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
    <li className="flex min-h-10 items-center gap-3.5 rounded-[10px] border border-dashed border-(--color-border-strong) px-3 text-xs text-(--color-text-muted)">
      <span className="w-24 tabular-nums">
        {clockOf(gap.start)} – {clockOf(gap.end)}
      </span>
      <span className="flex-1">Untracked {formatElapsed(gap.seconds)}</span>
      <button
        type="button"
        className="rounded-md px-2 py-1 font-semibold text-(--color-accent) transition-colors hover:bg-(--color-accent-tint)"
        onClick={() => {
          setFilling(true);
        }}
      >
        Fill gap
      </button>
    </li>
  );
};
