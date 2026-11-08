import { useState } from 'react';

import { useVaultAction } from '../../../shared/hooks/use-vault-action';
import { Button } from '../../../shared/ui/button';
import { useDayKeys } from '../hooks/use-day-keys';
import { useDayView } from '../hooks/use-day-view';
import { DayHeader } from './day-header';
import { EntryForm, type EntryValues } from './entry-form';
import { EntryRow } from './entry-row';
import { GapRow } from './gap-row';
import { RunningRow } from './running-row';

const NEW_ENTRY = { description: '', project: '', start: '09:00', end: '10:00' };

/** Today (PRD 6.3): the day's entries with notes, gaps to fill, totals and day navigation. */
export const TodayView = () => {
  useDayKeys();
  const view = useDayView();
  const [adding, setAdding] = useState(false);
  const act = useVaultAction();
  if (view === null) {
    return null;
  }
  const add = async (values: EntryValues) =>
    (await act('Add entry', ({ entries }) => entries.create(values))) !== undefined;
  return (
    <section className="flex flex-col gap-4">
      <DayHeader view={view} />
      {view.rows.length === 0 ? (
        <p className="text-sm text-(--color-text-muted)">Nothing tracked on this day.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {view.rows.map((row) => {
            if (row.kind === 'gap') {
              return <GapRow key={`gap-${row.gap.start}`} gap={row.gap} date={view.date} />;
            }
            return row.kind === 'running' ? (
              <RunningRow key={row.entry.id} entry={row.entry} />
            ) : (
              <EntryRow key={row.entry.id} entry={row.entry} date={view.date} />
            );
          })}
        </ul>
      )}
      {adding ? (
        <EntryForm
          date={view.date}
          initial={NEW_ENTRY}
          submitLabel="Add entry"
          onSubmit={add}
          onCancel={() => {
            setAdding(false);
          }}
        />
      ) : (
        <div>
          <Button
            onClick={() => {
              setAdding(true);
            }}
          >
            Add entry
          </Button>
        </div>
      )}
    </section>
  );
};
