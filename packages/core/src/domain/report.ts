import { TTimeError } from '../lib/errors';
import { amountFor, sumMoney } from '../lib/money';
import { compareTimestamps, type LocalDate, type Timestamp } from '../lib/time';
import type { Client } from '../schema/client';
import type { Entry, Note } from '../schema/entry';
import type { Money } from '../schema/primitives';
import type { Project } from '../schema/project';
import { type Rounding, roundSeconds } from './rounding';
import { splitByDay } from './split-by-day';

/** One entry's time on one report day: a Detailed export row. */
export type ReportRow = {
  readonly date: LocalDate;
  readonly start: Timestamp;
  readonly end: Timestamp;
  /** Seconds as tracked. */
  readonly rawSeconds: number;
  /** Seconds after per-entry rounding; equal to `rawSeconds` with day scope or no rounding. */
  readonly seconds: number;
  readonly project: string;
  readonly projectName: string;
  readonly clientName: string;
  readonly description: string;
  readonly notes: readonly Note[];
  readonly tags: readonly string[];
  readonly billable: boolean;
  readonly rate: Money | null;
  readonly amount: Money | null;
};

/** Inputs of {@link reportRows}. */
export type ReportInput = {
  readonly entries: readonly Entry[];
  /** First and last report day, inclusive. */
  readonly from: LocalDate;
  readonly to: LocalDate;
  /** Only this project; all projects when null. */
  readonly project: string | null;
  readonly projects: ReadonlyMap<string, Project>;
  readonly clients: ReadonlyMap<string, Client>;
  readonly timeZone: string;
  readonly dayStartsAt: string;
  readonly rounding: Rounding;
};

/** The hourly rate of a project: its own, else its client's default, else none. */
const rateOf = (project: Project | undefined, clients: ReadonlyMap<string, Client>): Money | null =>
  project?.rate ??
  (project?.client === undefined ? undefined : clients.get(project.client)?.defaultRate) ??
  null;

const priced = (billable: boolean, rate: Money | null, seconds: number): Money | null =>
  billable && rate !== null ? amountFor(seconds, rate) : null;

const rowsOf = (entry: Entry, input: ReportInput): ReportRow[] => {
  const project = input.projects.get(entry.project);
  const client = project?.client === undefined ? undefined : input.clients.get(project.client);
  const rate = rateOf(project, input.clients);
  const segments = splitByDay(entry.start, entry.end, {
    timeZone: input.timeZone,
    dayStartsAt: input.dayStartsAt,
  });
  return segments
    .filter((segment) => segment.date >= input.from && segment.date <= input.to)
    .map((segment) => {
      const seconds =
        input.rounding.scope === 'entry'
          ? roundSeconds(segment.seconds, input.rounding)
          : segment.seconds;
      return {
        date: segment.date,
        start: segment.start,
        end: segment.end,
        rawSeconds: segment.seconds,
        seconds,
        project: entry.project,
        projectName: project?.name ?? entry.project,
        clientName: client?.name ?? '',
        description: entry.description,
        notes: entry.notes.filter(
          (note) =>
            compareTimestamps(note.at, segment.start) >= 0 &&
            compareTimestamps(note.at, segment.end) <= 0,
        ),
        tags: entry.tags,
        billable: entry.billable,
        rate,
        amount: priced(entry.billable, rate, seconds),
      };
    });
};

/**
 * Detailed report rows for `[from, to]`: each finished entry split at report-day boundaries
 * (`dayStartsAt` in `timeZone`), by date then start. Per-entry rounding applies here; day
 * rounding applies in {@link dailySummary}. Pure.
 */
export const reportRows = (input: ReportInput): ReportRow[] =>
  input.entries
    .filter((entry) => input.project === null || entry.project === input.project)
    .flatMap((entry) => rowsOf(entry, input))
    .sort((a, b) => a.date.localeCompare(b.date) || compareTimestamps(a.start, b.start));

/**
 * One project's time on one day, billable and non-billable apart: a Daily summary row. `start`
 * and `end` span the day's first and last entry; `description` joins unique descriptions with
 * `; `.
 */
export type SummaryRow = ReportRow;

const unique = (values: readonly string[]): string[] => [
  ...new Set(values.filter((value) => value !== '')),
];

/**
 * Daily summary rows: Detailed rows merged per date, project and billable. Descriptions,
 * notes and tags are merged. With day scope the day total is rounded; with entry scope it is the
 * sum of the rounded entries. Pure.
 */
export const dailySummary = (rows: readonly ReportRow[], rounding: Rounding): SummaryRow[] => {
  const groups = new Map<string, ReportRow[]>();
  for (const row of rows) {
    const key = `${row.date}|${row.project}|${String(row.billable)}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.values()].map((group) => {
    const [first] = group;
    const last = group.at(-1) ?? first;
    if (first === undefined || last === undefined) {
      throw new TTimeError('internal.invariant', 'Empty summary group');
    }
    const rawSeconds = group.reduce((sum, row) => sum + row.rawSeconds, 0);
    const summed = group.reduce((sum, row) => sum + row.seconds, 0);
    const seconds = rounding.scope === 'day' ? roundSeconds(rawSeconds, rounding) : summed;
    return {
      ...first,
      start: first.start,
      end: last.end,
      rawSeconds,
      seconds,
      description: unique(group.map((row) => row.description)).join('; '),
      notes: group.flatMap((row) => row.notes),
      tags: unique(group.flatMap((row) => row.tags)),
      amount: priced(first.billable, first.rate, seconds),
    };
  });
};

/** Totals of report or summary rows. */
export type ReportTotals = {
  readonly seconds: number;
  readonly billableSeconds: number;
  /** One amount per currency, by currency code. */
  readonly amounts: readonly Money[];
};

/** Sums rows' (rounded) seconds, billable seconds and amounts. Pure. */
export const reportTotals = (rows: readonly ReportRow[]): ReportTotals => ({
  seconds: rows.reduce((sum, row) => sum + row.seconds, 0),
  billableSeconds: rows.reduce((sum, row) => sum + (row.billable ? row.seconds : 0), 0),
  amounts: sumMoney(rows.flatMap((row) => (row.amount === null ? [] : [row.amount]))),
});
