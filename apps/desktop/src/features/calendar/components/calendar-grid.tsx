import type { Entry, LocalDate, WeekView } from '@ttime/core';
import { useEffect, useRef } from 'react';

import { useCalendarDrag } from '../hooks/use-calendar-drag';
import type { DragCommit } from '../lib/drag';
import { DAY_PX, dayPieces, HOUR_PX, MINUTE_PX } from '../lib/layout';
import { DayColumn } from './day-column';

type Props = {
  readonly week: WeekView;
  readonly start: LocalDate;
  readonly zone: string;
  readonly byId: ReadonlyMap<string, Entry>;
  readonly onOpen: (id: string) => void;
  readonly onCommit: (commit: DragCommit) => void;
};

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const HOUR_LINES = `repeating-linear-gradient(to bottom, var(--color-border) 0, var(--color-border) 1px, transparent 1px, transparent ${String(HOUR_PX)}px)`;

/** The scrollable time grid: hour labels and seven day columns that take the pointer gestures. */
export const CalendarGrid = ({ week, start, zone, byId, onOpen, onCommit }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { preview, handlers } = useCalendarDrag({ start, zone, byId, onClick: onOpen, onCommit });
  const firstWork = week.days.find((day) => day.working !== null)?.working?.startMinute ?? 8 * 60;
  // Read once: later setting changes never jump the scroll position.
  const initialTopRef = useRef(Math.max(firstWork - 60, 0) * MINUTE_PX);
  useEffect(() => {
    if (scrollRef.current !== null) {
      scrollRef.current.scrollTop = initialTopRef.current;
    }
  }, []);
  const pieces = preview === null ? [] : dayPieces(preview.span);
  const draggingId =
    preview !== null && preview.drag.kind === 'move' && !preview.drag.duplicate
      ? preview.drag.id
      : null;
  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-(--color-border)"
    >
      <div className="grid grid-cols-[3.5rem_minmax(0,1fr)]" style={{ height: DAY_PX }}>
        <div className="relative">
          {HOURS.map((hour) => (
            <span
              key={hour}
              className="absolute right-2 -translate-y-1/2 text-xs text-(--color-text-muted) tabular-nums"
              style={{ top: hour * HOUR_PX }}
            >
              {hour === 0 ? '' : `${String(hour).padStart(2, '0')}:00`}
            </span>
          ))}
        </div>
        <div
          role="presentation"
          className="grid touch-none grid-cols-7 select-none"
          style={{ backgroundImage: HOUR_LINES }}
          {...handlers}
        >
          {week.days.map((day, index) => (
            <DayColumn
              key={day.date}
              day={day}
              nowMinute={week.now?.date === day.date ? week.now.minute : null}
              draggingId={draggingId}
              preview={pieces.find((piece) => piece.day === index) ?? null}
              onOpen={onOpen}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
