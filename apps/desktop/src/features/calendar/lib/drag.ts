import {
  addDays,
  DAY_MINUTES,
  type LocalDate,
  type Timestamp,
  timestampOn,
  toZoned,
} from '@ttime/core';

/** Default snap in minutes (ARCHITECTURE 7.3); ⌥ during a drag snaps to 1 minute. */
export const SNAP_MINUTES = 5;

/** Pointer travel in pixels below which a press is a click, not a drag. */
export const CLICK_SLOP = 4;

/** A gesture in progress. Positions are week minutes: day index × 1440 + minute of the day. */
export type Drag =
  | { readonly kind: 'create'; readonly anchor: number }
  | {
      readonly kind: 'move';
      readonly id: string;
      readonly start: number;
      readonly end: number;
      /** Where the pointer went down. */
      readonly grab: number;
      /** ⌥ was down at the start: drop a copy instead of moving. */
      readonly duplicate: boolean;
    }
  | {
      readonly kind: 'resize';
      readonly id: string;
      readonly edge: 'start' | 'end';
      readonly start: number;
      readonly end: number;
    };

/** The span a gesture shows, in week minutes. */
export type Span = { readonly start: number; readonly end: number };

/** What a finished gesture asks the core to do: exactly one call. */
export type DragCommit =
  | { readonly kind: 'create'; readonly start: Timestamp; readonly end: Timestamp }
  | { readonly kind: 'move'; readonly id: string; readonly start: Timestamp }
  | {
      readonly kind: 'duplicate';
      readonly id: string;
      readonly start: Timestamp;
      readonly end: Timestamp;
    }
  | {
      readonly kind: 'resize';
      readonly id: string;
      readonly patch: { readonly start: Timestamp } | { readonly end: Timestamp };
    };

/** Rounds week minutes to `step`. */
export const snap = (minutes: number, step: number): number => Math.round(minutes / step) * step;

/** The span `drag` shows with the pointer at `point` (week minutes). */
export const spanOf = (drag: Drag, point: number, step: number): Span => {
  switch (drag.kind) {
    case 'create': {
      const [a, b] = [snap(drag.anchor, step), snap(point, step)];
      return { start: Math.min(a, b), end: Math.max(a, b) };
    }
    case 'move': {
      const start = snap(drag.start + point - drag.grab, step);
      return { start, end: start + drag.end - drag.start };
    }
    case 'resize': {
      return drag.edge === 'start'
        ? { start: Math.min(snap(point, step), drag.end - step), end: drag.end }
        : { start: drag.start, end: Math.max(snap(point, step), drag.start + step) };
    }
  }
};

/** Week minutes of `timestamp` in the week starting `weekStart`. */
export const weekMinuteOf = (timestamp: Timestamp, weekStart: LocalDate, zone: string): number => {
  const time = toZoned(timestamp, zone);
  const days = toZoned(timestampAt(0, weekStart, zone), zone)
    .toPlainDate()
    .until(time.toPlainDate()).days;
  return days * DAY_MINUTES + time.hour * 60 + time.minute + time.second / 60;
};

const pad = (value: number): string => String(value).padStart(2, '0');

/** The timestamp at week minute `minutes` (whole minutes) of the week starting `weekStart`. */
export const timestampAt = (minutes: number, weekStart: LocalDate, zone: string): Timestamp => {
  const whole = Math.round(minutes);
  const day = Math.floor(whole / DAY_MINUTES);
  const inDay = whole - day * DAY_MINUTES;
  const clock = `${pad(Math.floor(inDay / 60))}:${pad(inDay % 60)}`;
  const stamp = timestampOn(addDays(weekStart, day), clock, zone);
  if (stamp === null) {
    throw new RangeError(`No time ${clock}`);
  }
  return stamp;
};

/**
 * The core call for a finished gesture, or null when nothing changed (or a new block is shorter
 * than one snap step).
 */
export const commitOf = (
  drag: Drag,
  span: Span,
  weekStart: LocalDate,
  zone: string,
): DragCommit | null => {
  const at = (minutes: number) => timestampAt(minutes, weekStart, zone);
  switch (drag.kind) {
    case 'create': {
      return span.end - span.start < 1
        ? null
        : { kind: 'create', start: at(span.start), end: at(span.end) };
    }
    case 'move': {
      if (drag.duplicate) {
        return { kind: 'duplicate', id: drag.id, start: at(span.start), end: at(span.end) };
      }
      return span.start === drag.start
        ? null
        : { kind: 'move', id: drag.id, start: at(span.start) };
    }
    case 'resize': {
      const minutes = drag.edge === 'start' ? span.start : span.end;
      if (minutes === (drag.edge === 'start' ? drag.start : drag.end)) {
        return null;
      }
      const patch = drag.edge === 'start' ? { start: at(minutes) } : { end: at(minutes) };
      return { kind: 'resize', id: drag.id, patch };
    }
  }
};
