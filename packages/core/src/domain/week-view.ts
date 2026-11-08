import { Temporal } from 'temporal-polyfill';

import {
  addDays,
  formatTimestamp,
  type LocalDate,
  secondsBetween,
  type Timestamp,
  toZoned,
} from '../lib/time';
import type { Entry, RunningEntry } from '../schema/entry';
import type { VaultSettings } from '../schema/vault-config';
import { splitByDay } from './split-by-day';
import { type Lane, layoutLanes } from './week-lanes';

/** Minutes in a calendar day. */
export const DAY_MINUTES = 24 * 60;

/** The part of an entry shown in one day column. */
export type WeekBlock = Lane & {
  readonly entry: Entry | RunningEntry;
  readonly running: boolean;
  /** The entry's end, or now for the running entry. */
  readonly end: Timestamp;
  /** Minutes after local midnight, 0 to 1440. */
  readonly startMinute: number;
  readonly endMinute: number;
  /** The entry began on an earlier day (this block starts at midnight). */
  readonly startsBefore: boolean;
  /** The entry goes on past midnight. */
  readonly endsAfter: boolean;
};

/** One day column. */
export type WeekDay = {
  readonly date: LocalDate;
  /** 1 is Monday, 7 is Sunday. */
  readonly dayOfWeek: number;
  readonly blocks: readonly WeekBlock[];
  readonly seconds: number;
  /** Working hours as minutes, or null on a day off. */
  readonly working: { readonly startMinute: number; readonly endMinute: number } | null;
};

/** The calendar week (PRD 6.3). */
export type WeekView = {
  readonly days: readonly WeekDay[];
  readonly seconds: number;
  /** Where the current-time line goes, when today is in the week. */
  readonly now: { readonly date: LocalDate; readonly minute: number } | null;
};

/** Inputs of {@link weekView}. */
export type WeekViewInput = {
  readonly start: LocalDate;
  /** Entries of the week's day files and the day before (for entries across midnight). */
  readonly entries: readonly Entry[];
  readonly running: RunningEntry | null;
  readonly now: Temporal.ZonedDateTime;
  readonly workingHours: Pick<VaultSettings['workingHours'], 'start' | 'end'> & {
    readonly days: readonly VaultSettings['workingHours']['days'][number][];
  };
};

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

const minutesOf = (time: string): number => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/** Wall-clock minutes of `time` on `date`; the next midnight is 1440. */
const minuteOn = (time: Temporal.ZonedDateTime, date: LocalDate): number =>
  time.toPlainDate().toString() > date
    ? DAY_MINUTES
    : time.hour * 60 + time.minute + time.second / 60;

type Item = {
  readonly entry: Entry | RunningEntry;
  readonly end: Timestamp;
  readonly running: boolean;
};

const blocksOn = (date: LocalDate, items: readonly Item[], zone: string) => {
  const parts = items.flatMap((item) => {
    const segments = splitByDay(item.entry.start, item.end, {
      timeZone: zone,
      dayStartsAt: '00:00',
    });
    return segments
      .filter((segment) => segment.date === date)
      .map((segment) => ({
        entry: item.entry,
        running: item.running,
        end: item.end,
        seconds: segment.seconds,
        startMinute: minuteOn(toZoned(segment.start, zone), date),
        endMinute: minuteOn(toZoned(segment.end, zone), date),
        startsBefore: segment.start !== item.entry.start,
        endsAfter: segment.end !== item.end,
      }));
  });
  parts.sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);
  const lanes = layoutLanes(parts);
  return parts.map(({ seconds, ...part }, index) => ({
    block: { ...part, ...(lanes[index] ?? { lane: 0, lanes: 1, overlaps: false }) },
    seconds,
  }));
};

/**
 * The seven days from `start`: entries as blocks per calendar day (split at midnight, laid out
 * side by side where they overlap), the running entry up to `now`, working hours and totals.
 * Pure.
 */
export const weekView = ({
  start,
  entries,
  running,
  now,
  workingHours,
}: WeekViewInput): WeekView => {
  const zone = now.timeZoneId;
  const items: Item[] = [
    ...entries.map((entry) => ({ entry, end: entry.end, running: false })),
    ...(running === null ? [] : [{ entry: running, end: formatTimestamp(now), running: true }]),
  ].filter((item) => secondsBetween(item.entry.start, item.end) > 0);
  const days = Array.from({ length: 7 }, (_, index): WeekDay => {
    const date = addDays(start, index);
    const placed = blocksOn(date, items, zone);
    const dayOfWeek = Temporal.PlainDate.from(date).dayOfWeek;
    const weekday = WEEKDAYS[dayOfWeek - 1] ?? 'mon';
    return {
      date,
      dayOfWeek,
      blocks: placed.map((item) => item.block),
      seconds: placed.reduce((sum, item) => sum + item.seconds, 0),
      working: workingHours.days.includes(weekday)
        ? { startMinute: minutesOf(workingHours.start), endMinute: minutesOf(workingHours.end) }
        : null,
    };
  });
  const today = now.toPlainDate().toString();
  return {
    days,
    seconds: days.reduce((sum, day) => sum + day.seconds, 0),
    now: days.some((day) => day.date === today)
      ? { date: today, minute: now.hour * 60 + now.minute + now.second / 60 }
      : null,
  };
};
