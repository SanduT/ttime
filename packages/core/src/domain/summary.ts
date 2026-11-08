import { sumMoney } from '../lib/money';
import type { Money } from '../schema/primitives';
import {
  dailySummary,
  type ReportInput,
  type ReportRow,
  reportRows,
  type ReportTotals,
  reportTotals,
} from './report';

/** How {@link summarize} groups time. */
export type SummaryGroupBy = 'project' | 'day' | 'tag' | 'description';

/** One group of a summary. */
export type SummaryGroup = {
  /** Project ID, date, tag or description; `''` for entries without a tag or description. */
  readonly key: string;
  readonly label: string;
  readonly seconds: number;
  readonly billableSeconds: number;
  readonly amounts: readonly Money[];
};

/** Totals and groups of a period. */
export type Summary = {
  readonly groupBy: SummaryGroupBy;
  readonly totals: ReportTotals;
  /** Most time first; by date for `day`. */
  readonly groups: readonly SummaryGroup[];
};

const keysOf = (
  row: ReportRow,
  groupBy: SummaryGroupBy,
): readonly (readonly [string, string])[] => {
  switch (groupBy) {
    case 'project':
      return [[row.project, row.projectName]];
    case 'day':
      return [[row.date, row.date]];
    case 'tag':
      return row.tags.length === 0 ? [['', '(no tag)']] : row.tags.map((tag) => [tag, `#${tag}`]);
    case 'description':
      return [[row.description, row.description === '' ? '(no description)' : row.description]];
  }
};

/**
 * Time in `input`'s period grouped by project, day, tag or description. Project and day groups
 * use the daily summary, so they equal a CSV export with the same rounding. Tag and description
 * groups use the detailed rows (per-entry rounding); an entry with several tags counts in each.
 * Pure.
 */
export const summarize = (input: ReportInput, groupBy: SummaryGroupBy): Summary => {
  const detailed = reportRows(input);
  const daily = dailySummary(detailed, input.rounding);
  const rows = groupBy === 'project' || groupBy === 'day' ? daily : detailed;
  const groups = new Map<string, { label: string; rows: ReportRow[] }>();
  for (const row of rows) {
    for (const [key, label] of keysOf(row, groupBy)) {
      const group = groups.get(key) ?? { label, rows: [] };
      group.rows.push(row);
      groups.set(key, group);
    }
  }
  const list = [...groups].map(([key, group]): SummaryGroup => {
    const totals = reportTotals(group.rows);
    return {
      key,
      label: group.label,
      seconds: totals.seconds,
      billableSeconds: totals.billableSeconds,
      amounts: sumMoney(group.rows.flatMap((row) => (row.amount === null ? [] : [row.amount]))),
    };
  });
  list.sort((a, b) =>
    groupBy === 'day'
      ? a.key.localeCompare(b.key)
      : b.seconds - a.seconds || a.label.localeCompare(b.label),
  );
  return { groupBy, totals: reportTotals(daily), groups: list };
};
