import { useVaultAction } from '../../../shared/hooks/use-vault-action';
import { useWeek } from '../hooks/use-week';
import { useWeekKeys } from '../hooks/use-week-keys';
import type { DragCommit } from '../lib/drag';
import { useCalendarStore } from '../store/calendar-store';
import { CalendarGrid } from './calendar-grid';
import { EntryDialog } from './entry-dialog';
import { WeekHeader } from './week-header';

/** The calendar week view (PRD 6.3): review and fix past time by dragging. */
export const CalendarView = () => {
  useWeekKeys();
  const { start, week, byId, zone } = useWeek();
  const editor = useCalendarStore((state) => state.editor);
  const edit = useCalendarStore((state) => state.edit);
  const act = useVaultAction();
  const commit = (change: DragCommit) => {
    switch (change.kind) {
      case 'create': {
        edit({ kind: 'create', start: change.start, end: change.end });
        return;
      }
      case 'move': {
        void act('Move entry', ({ entries }) => entries.move(change.id, change.start));
        return;
      }
      case 'resize': {
        void act('Resize entry', ({ entries }) => entries.update(change.id, change.patch));
        return;
      }
      case 'duplicate': {
        const source = byId.get(change.id);
        if (source !== undefined) {
          const { project, description, tags, billable } = source;
          void act('Duplicate entry', ({ entries }) =>
            entries.create({
              project,
              description,
              tags,
              billable,
              start: change.start,
              end: change.end,
            }),
          );
        }
      }
    }
  };
  const today = week.now?.date ?? '';
  return (
    <section className="flex h-full flex-col gap-3">
      <WeekHeader week={week} today={today} />
      <CalendarGrid
        week={week}
        start={start}
        zone={zone}
        byId={byId}
        onOpen={(id) => {
          edit({ kind: 'edit', id });
        }}
        onCommit={commit}
      />
      {editor === null ? null : <EntryDialog editor={editor} byId={byId} zone={zone} />}
    </section>
  );
};
