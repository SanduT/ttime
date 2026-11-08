import { Temporal } from 'temporal-polyfill';

import type { LocalDate } from '../lib/time';
import type { VaultSettings } from '../schema/vault-config';
import { weekStartOf } from './current-totals';

/** Period presets for exports and reports, like a bank statement export. */
export type PeriodPreset =
  'today' | 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'this-year';

/** A date range, both ends inclusive. */
export type DateRange = { readonly from: LocalDate; readonly to: LocalDate };

/** The whole calendar month `month` (`2026-11`). */
export const monthRange = (month: string): DateRange => {
  const start = Temporal.PlainYearMonth.from(month);
  return {
    from: start.toPlainDate({ day: 1 }).toString(),
    to: start.toPlainDate({ day: start.daysInMonth }).toString(),
  };
};

/** The full week or month of `preset` around `today`; weeks start on `weekStartsOn`. Pure. */
export const presetRange = (
  preset: PeriodPreset,
  today: LocalDate,
  weekStartsOn: VaultSettings['weekStartsOn'],
): DateRange => {
  const date = Temporal.PlainDate.from(today);
  const week = (offset: number): DateRange => {
    const start = weekStartOf(date, weekStartsOn).add({ weeks: offset });
    return { from: start.toString(), to: start.add({ days: 6 }).toString() };
  };
  switch (preset) {
    case 'today': {
      return { from: today, to: today };
    }
    case 'this-year': {
      return { from: `${String(date.year)}-01-01`, to: `${String(date.year)}-12-31` };
    }
    case 'this-week': {
      return week(0);
    }
    case 'last-week': {
      return week(-1);
    }
    case 'this-month': {
      return monthRange(date.toPlainYearMonth().toString());
    }
    case 'last-month': {
      return monthRange(date.toPlainYearMonth().subtract({ months: 1 }).toString());
    }
  }
};

/** The last `count` months up to `today`'s, newest first, as `yyyy-mm`. Pure. */
export const recentMonths = (today: LocalDate, count: number): string[] => {
  const current = Temporal.PlainDate.from(today).toPlainYearMonth();
  return Array.from({ length: count }, (_, i) => current.subtract({ months: i }).toString());
};

/**
 * `range` moved by `steps` periods of its own kind: days for Today, weeks, months (whole months)
 * or years for presets, and its own length for a custom range. Pure.
 */
export const shiftRange = (
  range: DateRange,
  preset: PeriodPreset | 'custom',
  steps: number,
): DateRange => {
  const from = Temporal.PlainDate.from(range.from);
  const to = Temporal.PlainDate.from(range.to);
  switch (preset) {
    case 'this-month':
    case 'last-month': {
      return monthRange(from.toPlainYearMonth().add({ months: steps }).toString());
    }
    case 'this-year': {
      const year = from.year + steps;
      return { from: `${String(year)}-01-01`, to: `${String(year)}-12-31` };
    }
    case 'today':
    case 'this-week':
    case 'last-week':
    case 'custom': {
      const days = from.until(to).days + 1;
      return {
        from: from.add({ days: days * steps }).toString(),
        to: to.add({ days: days * steps }).toString(),
      };
    }
  }
};
