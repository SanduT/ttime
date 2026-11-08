import { Temporal } from 'temporal-polyfill';

import { MS_PER_SECOND } from './constants';
import { TTimeError } from './errors';

/** Vault timestamp format: seconds precision and a numeric UTC offset, e.g. `2026-11-08T09:30:00+02:00`. */
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

/** A vault timestamp string. */
export type Timestamp = string;

/** A local calendar date, `yyyy-mm-dd`. */
export type LocalDate = string;

/** True when `value` is a well-formed vault timestamp that denotes a real instant. */
export const isTimestamp = (value: string): boolean => {
  if (!TIMESTAMP_PATTERN.test(value)) {
    return false;
  }
  try {
    Temporal.Instant.from(value);
    Temporal.PlainDateTime.from(value);
    return true;
  } catch {
    return false;
  }
};

/** True when `value` is a valid `yyyy-mm-dd` date. */
export const isLocalDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  try {
    return Temporal.PlainDate.from(value, { overflow: 'reject' }).toString() === value;
  } catch {
    return false;
  }
};

/** True when `value` is a valid `HH:MM` wall-clock time. */
export const isLocalTime = (value: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/** Formats a zoned time as a vault timestamp, truncated to whole seconds. */
export const formatTimestamp = (time: Temporal.ZonedDateTime): Timestamp =>
  time.toString({ smallestUnit: 'second', timeZoneName: 'never', roundingMode: 'trunc' });

/** The instant a vault timestamp denotes. Throws `input.invalid` for malformed input. */
export const toInstant = (timestamp: Timestamp): Temporal.Instant => {
  if (!isTimestamp(timestamp)) {
    throw new TTimeError('input.invalid', `Invalid timestamp: ${timestamp}`);
  }
  return Temporal.Instant.from(timestamp);
};

/** Whole seconds since the Unix epoch. */
export const epochSeconds = (timestamp: Timestamp): number =>
  Math.floor(toInstant(timestamp).epochMilliseconds / MS_PER_SECOND);

/** Orders two timestamps by the instant they denote, regardless of offset. */
export const compareTimestamps = (a: Timestamp, b: Timestamp): number =>
  Temporal.Instant.compare(toInstant(a), toInstant(b));

/** Whole seconds from `start` to `end` (negative when `end` is earlier). */
export const secondsBetween = (start: Timestamp, end: Timestamp): number =>
  epochSeconds(end) - epochSeconds(start);

/** The local date written in a timestamp (its own offset), which decides the entry's day file. */
export const localDateOf = (timestamp: Timestamp): LocalDate => {
  toInstant(timestamp);
  return timestamp.slice(0, 10);
};

/** The `yyyy-mm` month of a timestamp's local date. */
export const monthOf = (timestamp: Timestamp): string => localDateOf(timestamp).slice(0, 7);

/**
 * A timestamp for messages: `HH:MM` in its own offset, with the date in front when it is not
 * `today` (`2026-11-07 23:30`).
 */
export const formatWallTime = (timestamp: Timestamp, today: LocalDate): string => {
  const clock = timestamp.slice(11, 16);
  const date = localDateOf(timestamp);
  return date === today ? clock : `${date} ${clock}`;
};

/** Re-reads a vault timestamp as a zoned time in `timeZone`. */
export const toZoned = (timestamp: Timestamp, timeZone: string): Temporal.ZonedDateTime =>
  toInstant(timestamp).toZonedDateTimeISO(timeZone);

/** Adds days to a local date. */
export const addDays = (date: LocalDate, days: number): LocalDate =>
  Temporal.PlainDate.from(date).add({ days }).toString();

/** Orders two local dates. */
export const compareDates = (a: LocalDate, b: LocalDate): number =>
  Temporal.PlainDate.compare(Temporal.PlainDate.from(a), Temporal.PlainDate.from(b));

const TYPED_CLOCK = /^([01]?\d|2[0-3]):?([0-5]\d)$/;

/**
 * The timestamp of a typed wall-clock time (`9:05`, `09:05` or `0905`) on `date` in `timeZone`,
 * or null when the text is not a time. Used by editors that show a day.
 */
export const timestampOn = (date: LocalDate, text: string, timeZone: string): Timestamp | null => {
  const match = TYPED_CLOCK.exec(text.trim());
  if (match === null) {
    return null;
  }
  const plainTime = Temporal.PlainTime.from({ hour: Number(match[1]), minute: Number(match[2]) });
  return formatTimestamp(Temporal.PlainDate.from(date).toZonedDateTime({ timeZone, plainTime }));
};
