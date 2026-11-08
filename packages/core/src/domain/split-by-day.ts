import { Temporal } from 'temporal-polyfill';

import { TTimeError } from '../lib/errors';
import { isLocalTime, type LocalDate, secondsBetween, type Timestamp, toZoned } from '../lib/time';

/** The part of an entry that counts toward one report day. */
export type DaySegment = {
  readonly date: LocalDate;
  readonly start: Timestamp;
  readonly end: Timestamp;
  readonly seconds: number;
};

/** Options for {@link splitByDay}. */
export type SplitOptions = {
  /** IANA time zone the report is shown in. */
  readonly timeZone: string;
  /** `HH:MM` when a report day begins (`ttime.json` `settings.dayStartsAt`). */
  readonly dayStartsAt: string;
};

const format = (time: Temporal.ZonedDateTime): Timestamp =>
  time.toString({ smallestUnit: 'second', timeZoneName: 'never', roundingMode: 'trunc' });

/** The report day a time belongs to: its local date, minus one if before `dayStartsAt`. */
const reportDate = (
  time: Temporal.ZonedDateTime,
  dayStart: Temporal.PlainTime,
): Temporal.PlainDate =>
  Temporal.PlainTime.compare(time.toPlainTime(), dayStart) < 0
    ? time.toPlainDate().subtract({ days: 1 })
    : time.toPlainDate();

/**
 * Splits `[start, end)` at report-day boundaries in `timeZone`. Durations are real elapsed
 * seconds, so a day with a daylight saving change counts 23 or 25 hours. Used by reports only;
 * which file an entry lives in never depends on this. Pure.
 */
export const splitByDay = (
  start: Timestamp,
  end: Timestamp,
  options: SplitOptions,
): DaySegment[] => {
  if (!isLocalTime(options.dayStartsAt)) {
    throw new TTimeError('input.invalid', `Invalid dayStartsAt: ${options.dayStartsAt}`);
  }
  const dayStart = Temporal.PlainTime.from(options.dayStartsAt);
  const last = toZoned(end, options.timeZone);
  const segments: DaySegment[] = [];
  let cursor = toZoned(start, options.timeZone);
  while (Temporal.ZonedDateTime.compare(cursor, last) < 0) {
    const date = reportDate(cursor, dayStart);
    const boundary = date
      .add({ days: 1 })
      .toZonedDateTime({ timeZone: options.timeZone, plainTime: dayStart });
    const segmentEnd = Temporal.ZonedDateTime.compare(boundary, last) < 0 ? boundary : last;
    const segment = { start: format(cursor), end: format(segmentEnd) };
    segments.push({
      date: date.toString(),
      ...segment,
      seconds: secondsBetween(segment.start, segment.end),
    });
    cursor = segmentEnd;
  }
  return segments;
};
