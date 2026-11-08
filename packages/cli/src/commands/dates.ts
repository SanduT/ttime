import {
  addDays,
  type DateRange,
  DEFAULT_SETTINGS,
  isLocalDate,
  isTimestamp,
  type LocalDate,
  type PeriodPreset,
  presetRange,
  type Temporal,
  type Timestamp,
  timestampOn,
  TTimeError,
  type VaultSnapshot,
} from '@ttime/core';

const LOCAL_DATE_TIME = /^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}:\d{2})$/;
const PRESETS: readonly PeriodPreset[] = [
  'today',
  'this-week',
  'last-week',
  'this-month',
  'last-month',
  'this-year',
];

/** `today`, `yesterday`, `tomorrow` or `YYYY-MM-DD` relative to `today`. */
export const parseDate = (value: string, today: LocalDate): LocalDate => {
  const word = value.trim().toLowerCase();
  const relative: Readonly<Record<string, number>> = { today: 0, yesterday: -1, tomorrow: 1 };
  const shift = relative[word];
  if (shift !== undefined) {
    return addDays(today, shift);
  }
  if (isLocalDate(word)) {
    return word;
  }
  throw new TTimeError(
    'input.invalid',
    `Use a date like 2026-11-07, today or yesterday, not "${value}".`,
  );
};

/**
 * A timestamp from an ISO time with offset, `YYYY-MM-DDTHH:MM` in `now`'s zone, or `HH:MM` on
 * `date` (default today).
 */
export const parseTime = (
  value: string,
  now: Temporal.ZonedDateTime,
  date: LocalDate = now.toPlainDate().toString(),
): Timestamp => {
  const trimmed = value.trim();
  if (isTimestamp(trimmed)) {
    return trimmed;
  }
  const local = LOCAL_DATE_TIME.exec(trimmed);
  const stamp =
    local === null
      ? timestampOn(date, trimmed, now.timeZoneId)
      : timestampOn(local[1] ?? '', local[2] ?? '', now.timeZoneId);
  if (stamp === null) {
    throw new TTimeError(
      'input.invalid',
      `Use a time like 17:30, 2026-11-07T14:00 or an ISO time with offset, not "${value}".`,
    );
  }
  return stamp;
};

/** `--period`, or `--from`/`--to` (each defaulting to the period's end), or `fallback`. */
export const parseRange = (
  options: { readonly period?: string; readonly from?: string; readonly to?: string },
  now: Temporal.ZonedDateTime,
  snapshot: VaultSnapshot,
  fallback: PeriodPreset,
): DateRange => {
  const today = now.toPlainDate().toString();
  const weekStartsOn = (snapshot.config?.settings ?? DEFAULT_SETTINGS).weekStartsOn;
  const preset = PRESETS.find((item) => item === options.period);
  if (options.period !== undefined && preset === undefined) {
    throw new TTimeError('input.invalid', `Use a period of ${PRESETS.join(', ')}.`);
  }
  const base = presetRange(preset ?? fallback, today, weekStartsOn);
  const from = options.from === undefined ? base.from : parseDate(options.from, today);
  const to =
    options.to === undefined
      ? options.from === undefined
        ? base.to
        : from
      : parseDate(options.to, today);
  if (to < from) {
    throw new TTimeError('input.invalid', `The range ends (${to}) before it starts (${from}).`);
  }
  return { from, to };
};
