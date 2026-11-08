import {
  DEFAULT_SETTINGS,
  formatTimestamp,
  type LocalDate,
  parseDuration,
  Temporal,
  type Timestamp,
  timestampOn,
  TTimeError,
  type VaultSnapshot,
} from '@ttime/core';

import type { CliContext } from '../runtime/context';
import { parseDate, parseTime } from './dates';
import { type EntryView, entryView } from './views';

/** A finished entry to add: `start` and `end`, or `start` or `date` with `duration`. */
export type AddInput = {
  readonly project: string;
  readonly description?: string;
  readonly start?: string;
  readonly end?: string;
  readonly date?: string;
  readonly duration?: string;
  readonly tags?: readonly string[];
  readonly billable?: boolean;
};

/** The entry that was added. */
export type AddResult = { readonly entry: EntryView };

/** Where an entry with only a date starts: after that day's last entry, else at work start. */
const defaultStart = (snapshot: VaultSnapshot, date: LocalDate, timeZone: string): Timestamp => {
  const last = (snapshot.days.get(date)?.entries ?? []).at(-1);
  if (last !== undefined) {
    return last.end;
  }
  const workStart = (snapshot.config?.settings ?? DEFAULT_SETTINGS).workingHours.start;
  return timestampOn(date, workStart, timeZone) ?? `${date}T09:00:00+00:00`;
};

const plusSeconds = (start: Timestamp, seconds: number, timeZone: string): Timestamp =>
  formatTimestamp(Temporal.Instant.from(start).add({ seconds }).toZonedDateTimeISO(timeZone));

/** Resolves start and end from the input. */
const rangeOf = (ctx: CliContext, snapshot: VaultSnapshot, input: AddInput) => {
  const now = ctx.clock.now();
  const date =
    input.date === undefined ? undefined : parseDate(input.date, now.toPlainDate().toString());
  const start =
    input.start === undefined
      ? defaultStart(snapshot, date ?? now.toPlainDate().toString(), ctx.timeZone)
      : parseTime(input.start, now, date);
  if (input.end !== undefined) {
    return { start, end: parseTime(input.end, now, date ?? start.slice(0, 10)) };
  }
  const seconds = input.duration === undefined ? null : parseDuration(input.duration);
  if (seconds === null) {
    throw new TTimeError('input.invalid', 'Pass --end, or --duration like 2h, 90m or 1h30m.');
  }
  return { start, end: plusSeconds(start, seconds, ctx.timeZone) };
};

/** Adds a finished entry. */
export const add = async (ctx: CliContext, input: AddInput): Promise<AddResult> => {
  const snapshot = await ctx.vault.read();
  const { start, end } = rangeOf(ctx, snapshot, input);
  const entry = await ctx.entries.create({
    project: input.project,
    start,
    end,
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.tags === undefined ? {} : { tags: input.tags }),
    ...(input.billable === undefined ? {} : { billable: input.billable }),
  });
  return { entry: entryView(entry, snapshot.projects) };
};
