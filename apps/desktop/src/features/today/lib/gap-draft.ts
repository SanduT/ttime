import type { Gap } from '@ttime/core';

const MINUTES_PER_DAY = 1440;
const MINUTES_PER_HOUR = 60;

const minutesOf = (timestamp: string): number =>
  Number(timestamp.slice(11, 13)) * MINUTES_PER_HOUR + Number(timestamp.slice(14, 16));

const clockOfMinutes = (minutes: number): string =>
  `${String(Math.floor(minutes / MINUTES_PER_HOUR)).padStart(2, '0')}:${String(minutes % MINUTES_PER_HOUR).padStart(2, '0')}`;

/**
 * The form times for filling `gap`: the start rounded up to the next minute and the end rounded
 * down, so the new entry never overlaps a neighbour that ends or starts mid-minute.
 */
export const gapTimes = (gap: Gap): { readonly start: string; readonly end: string } => {
  const startsMidMinute = gap.start.slice(17, 19) !== '00';
  const start = Math.min(minutesOf(gap.start) + (startsMidMinute ? 1 : 0), MINUTES_PER_DAY - 1);
  const end = Math.max(minutesOf(gap.end), start);
  return { start: clockOfMinutes(start), end: clockOfMinutes(end) };
};
