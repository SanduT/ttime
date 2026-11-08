import type { WeekDay } from '@ttime/core';

import { MINUTE_PX } from '../lib/layout';
import { EntryBlock } from './entry-block';

type Props = {
  readonly day: WeekDay;
  /** Minute of the current-time line, when this column is today. */
  readonly nowMinute: number | null;
  readonly draggingId: string | null;
  /** A drag preview piece in this column. */
  readonly preview: { readonly start: number; readonly end: number } | null;
  readonly onOpen: (id: string) => void;
};

/** One day: the working-hours band, entry blocks, the drag preview and the now line. */
export const DayColumn = ({ day, nowMinute, draggingId, preview, onOpen }: Props) => (
  <div className="relative border-l border-(--color-border)">
    {day.working === null ? null : (
      <div
        aria-hidden
        className="absolute inset-x-0 bg-(--color-control)"
        style={{
          top: day.working.startMinute * MINUTE_PX,
          height: (day.working.endMinute - day.working.startMinute) * MINUTE_PX,
        }}
      />
    )}
    {day.blocks.map((block) => (
      <EntryBlock
        key={`${block.entry.id}-${String(block.startMinute)}`}
        block={block}
        dragging={block.entry.id === draggingId}
        onOpen={onOpen}
      />
    ))}
    {preview === null ? null : (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0.5 rounded-md border-2 border-dashed border-(--color-accent) bg-(--color-accent)/15"
        style={{
          top: preview.start * MINUTE_PX,
          height: (preview.end - preview.start) * MINUTE_PX,
        }}
      />
    )}
    {nowMinute === null ? null : (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 h-0.5 bg-(--color-danger)"
        style={{ top: nowMinute * MINUTE_PX }}
      />
    )}
  </div>
);
