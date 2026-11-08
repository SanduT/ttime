import { DAY_MINUTES, type Entry, type LocalDate } from '@ttime/core';
import { type PointerEvent, useState } from 'react';

import {
  CLICK_SLOP,
  commitOf,
  type Drag,
  type DragCommit,
  SNAP_MINUTES,
  type Span,
  spanOf,
  weekMinuteOf,
} from '../lib/drag';
import { MINUTE_PX } from '../lib/layout';

type Active = {
  readonly drag: Drag;
  readonly span: Span;
  readonly x: number;
  readonly y: number;
  readonly moved: boolean;
};

type Options = {
  readonly start: LocalDate;
  readonly zone: string;
  readonly byId: ReadonlyMap<string, Entry>;
  readonly onClick: (id: string) => void;
  readonly onCommit: (commit: DragCommit) => void;
};

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

/** Week minutes under the pointer, from the 7-column grid element. */
const pointOf = (event: PointerEvent<HTMLElement>): number => {
  const rect = event.currentTarget.getBoundingClientRect();
  const day = clamp(Math.floor(((event.clientX - rect.left) / rect.width) * 7), 0, 6);
  const minute = clamp((event.clientY - rect.top) / MINUTE_PX, 0, DAY_MINUTES);
  return day * DAY_MINUTES + minute;
};

/**
 * Pointer gestures on the week grid: drag on empty space creates, a block's edges resize, its
 * body moves (⌥ at the start duplicates), ⌥ while dragging snaps to 1 minute, a press without
 * movement is a click. Running blocks are not draggable.
 */
export const useCalendarDrag = ({ start, zone, byId, onClick, onCommit }: Options) => {
  const [active, setActive] = useState<Active | null>(null);

  const dragFor = (event: PointerEvent<HTMLElement>, point: number): Drag | null => {
    const target = event.target instanceof Element ? event.target.closest('[data-block]') : null;
    if (target === null) {
      return { kind: 'create', anchor: point };
    }
    const entry = byId.get(target.getAttribute('data-block') ?? '');
    if (entry === undefined) {
      return null;
    }
    const span = {
      start: weekMinuteOf(entry.start, start, zone),
      end: weekMinuteOf(entry.end, start, zone),
    };
    const edge = target.getAttribute('data-edge');
    if (edge === 'start' || edge === 'end') {
      return { kind: 'resize', id: entry.id, edge, ...span };
    }
    return { kind: 'move', id: entry.id, ...span, grab: point, duplicate: event.altKey };
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return;
    }
    const point = pointOf(event);
    const drag = dragFor(event, point);
    if (drag === null) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setActive({
      drag,
      span: spanOf(drag, point, SNAP_MINUTES),
      x: event.clientX,
      y: event.clientY,
      moved: false,
    });
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (active === null) {
      return;
    }
    const moved =
      active.moved || Math.hypot(event.clientX - active.x, event.clientY - active.y) > CLICK_SLOP;
    const span = spanOf(active.drag, pointOf(event), event.altKey ? 1 : SNAP_MINUTES);
    setActive({ ...active, moved, span });
  };

  const onPointerUp = () => {
    if (active === null) {
      return;
    }
    setActive(null);
    const { drag, span, moved } = active;
    if (!moved) {
      if (drag.kind !== 'create') {
        onClick(drag.id);
      }
      return;
    }
    const commit = commitOf(drag, span, start, zone);
    if (commit !== null) {
      onCommit(commit);
    }
  };

  return {
    /** The span to preview and the entry it comes from, while a drag is under way. */
    preview: active?.moved === true ? active : null,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: () => {
        setActive(null);
      },
    },
  };
};
