import { DAY_MINUTES } from '@ttime/core';

/** Height of one hour in the grid, in pixels. */
export const HOUR_PX = 48;
/** Pixels per minute. */
export const MINUTE_PX = HOUR_PX / 60;
/** Height of the whole day column. */
export const DAY_PX = DAY_MINUTES * MINUTE_PX;
/** Blocks never get shorter than this, so short entries stay clickable. */
export const MIN_BLOCK_PX = 14;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** `2026-11-02` as `Nov 2`. */
const shortDate = (date: string): string =>
  `${MONTHS[Number(date.slice(5, 7)) - 1] ?? ''} ${String(Number(date.slice(8, 10)))}`;

/** `Mon` for a weekday index from Temporal (1 is Monday). */
export const weekdayName = (dayOfWeek: number): string => WEEKDAYS[dayOfWeek - 1] ?? '';

/** `Nov 2 – Nov 8, 2026` for a week. */
export const weekTitle = (start: string, end: string): string =>
  `${shortDate(start)} – ${shortDate(end)}, ${end.slice(0, 4)}`;

/** Splits a span of week minutes into per-day pieces (day index, start and end minute). */
export const dayPieces = (span: {
  readonly start: number;
  readonly end: number;
}): { readonly day: number; readonly start: number; readonly end: number }[] =>
  Array.from({ length: 7 }, (_, day) => ({
    day,
    start: Math.max(span.start, day * DAY_MINUTES) - day * DAY_MINUTES,
    end: Math.min(span.end, (day + 1) * DAY_MINUTES) - day * DAY_MINUTES,
  })).filter((piece) => piece.end > piece.start);
