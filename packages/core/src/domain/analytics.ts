import { sumMoney } from '../lib/money';
import { addDays, type LocalDate } from '../lib/time';
import type { Money } from '../schema/primitives';
import {
  dailySummary,
  type ReportInput,
  type ReportRow,
  reportRows,
  type ReportTotals,
  reportTotals,
} from './report';

/** One project's share of a period. */
export type ProjectShare = {
  readonly project: string;
  readonly name: string;
  readonly color: string;
  readonly seconds: number;
  readonly billableSeconds: number;
  /** Fraction of the period total, 0 to 1. */
  readonly share: number;
  readonly amounts: readonly Money[];
};

/** One day of a period with its time per project. */
export type DayShare = {
  readonly date: LocalDate;
  readonly seconds: number;
  readonly byProject: readonly { readonly project: string; readonly seconds: number }[];
};

/** The Analytics view of a period (PRD 6.3). */
export type Analytics = {
  readonly totals: ReportTotals;
  /** Most time first. */
  readonly projects: readonly ProjectShare[];
  /** Every day of the period, including empty ones. */
  readonly days: readonly DayShare[];
  /** Detailed rows (raw entry parts), for drilling into a project. */
  readonly rows: readonly ReportRow[];
};

const FALLBACK_COLOR = '#8E8E93';

const daysOf = (from: LocalDate, to: LocalDate): LocalDate[] => {
  const dates: LocalDate[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
};

const byProjectOf = (rows: readonly ReportRow[]) => {
  const groups = new Map<string, ReportRow[]>();
  for (const row of rows) {
    groups.set(row.project, [...(groups.get(row.project) ?? []), row]);
  }
  return groups;
};

/**
 * Totals, per-project shares and per-day stacks for `input`'s period. Durations are the daily
 * summary's (rounded per entry or per project day, as `input.rounding` says), so they equal a CSV
 * export with the same rounding. Pure.
 */
export const analytics = (input: ReportInput): Analytics => {
  const rows = reportRows(input);
  const summary = dailySummary(rows, input.rounding);
  const totals = reportTotals(summary);
  const projects = [...byProjectOf(summary)]
    .map(([project, group]): ProjectShare => {
      const groupTotals = reportTotals(group);
      return {
        project,
        name: group[0]?.projectName ?? project,
        color: input.projects.get(project)?.color ?? FALLBACK_COLOR,
        seconds: groupTotals.seconds,
        billableSeconds: groupTotals.billableSeconds,
        share: totals.seconds === 0 ? 0 : groupTotals.seconds / totals.seconds,
        amounts: sumMoney(group.flatMap((row) => (row.amount === null ? [] : [row.amount]))),
      };
    })
    .sort((a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name));
  const order = new Map(projects.map((project, index) => [project.project, index]));
  const days = daysOf(input.from, input.to).map((date): DayShare => {
    const dayRows = summary.filter((row) => row.date === date);
    const byProject = [...byProjectOf(dayRows)]
      .map(([project, group]) => ({ project, seconds: reportTotals(group).seconds }))
      .sort((a, b) => (order.get(a.project) ?? 0) - (order.get(b.project) ?? 0));
    return { date, seconds: reportTotals(dayRows).seconds, byProject };
  });
  return { totals, projects, days, rows };
};
