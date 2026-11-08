import { formatElapsed } from '../lib/duration';
import { decimalHours } from '../lib/money';
import type { LocalDate } from '../lib/time';
import type { VaultSettings } from '../schema/vault-config';
import {
  dailySummary,
  type ReportInput,
  type ReportRow,
  reportRows,
  type ReportTotals,
  reportTotals,
} from './report';

/** Delimiter, decimal separator and BOM (`ttime.json` `settings.csv`). */
export type CsvOptions = Pick<VaultSettings['csv'], 'delimiter' | 'decimalSeparator' | 'bom'>;

/** Detailed: one row per entry and day. Daily: one row per project, day and billable. */
export type ExportMode = 'detailed' | 'daily';

const DETAILED_COLUMNS = [
  'date',
  'start',
  'end',
  'duration_decimal',
  'duration_hhmm',
  'project',
  'client',
  'description',
  'notes',
  'tags',
  'billable',
  'rate',
  'amount',
  'currency',
] as const;

const DAILY_COLUMNS = DETAILED_COLUMNS.filter((column) => column !== 'start' && column !== 'end');

const BOM = '﻿';
const LINE_END = '\r\n';

/** RFC 4180: quote a field holding the delimiter, a quote or a line break; double quotes. */
const quote = (value: string, delimiter: string): string =>
  value.includes(delimiter) || /["\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

const decimal = (value: string, options: CsvOptions): string =>
  options.decimalSeparator === ',' ? value.replace('.', ',') : value;

const fieldsOf = (
  row: ReportRow,
  options: CsvOptions,
): Readonly<Record<(typeof DETAILED_COLUMNS)[number], string>> => ({
  date: row.date,
  start: row.start.slice(11, 16),
  end: row.end.slice(11, 16),
  duration_decimal: decimal(decimalHours(row.seconds), options),
  duration_hhmm: formatElapsed(row.seconds),
  project: row.projectName,
  client: row.clientName,
  description: row.description,
  notes: row.notes.map((note) => `${note.at.slice(11, 16)} ${note.text}`).join(' | '),
  tags: row.tags.join(', '),
  billable: row.billable ? 'yes' : 'no',
  rate: row.rate === null ? '' : decimal(row.rate.amount, options),
  amount: row.amount === null ? '' : decimal(row.amount.amount, options),
  currency: row.amount?.currency ?? row.rate?.currency ?? '',
});

/**
 * CSV text for report rows (PRD 6.4): RFC 4180 quoting, CRLF line ends, the chosen delimiter and
 * decimal separator, and a UTF-8 BOM when asked so Excel reads it right. Times are wall-clock
 * `HH:MM`; notes are joined as `10:42 text | 11:05 text`. Pure.
 */
export const toCsv = (
  rows: readonly ReportRow[],
  mode: ExportMode,
  options: CsvOptions,
): string => {
  const columns = mode === 'detailed' ? DETAILED_COLUMNS : DAILY_COLUMNS;
  const lines = [
    columns.join(options.delimiter),
    ...rows.map((row) => {
      const fields = fieldsOf(row, options);
      return columns
        .map((column) => quote(fields[column], options.delimiter))
        .join(options.delimiter);
    }),
  ];
  return `${options.bom ? BOM : ''}${lines.join(LINE_END)}${LINE_END}`;
};

/** What an export holds before it is written. */
export type ExportPreview = {
  readonly text: string;
  readonly rows: number;
  readonly totals: ReportTotals;
};

/** Report rows for `input`, as `mode` rows, as CSV text with their totals. Pure. */
export const buildExport = (
  input: ReportInput,
  mode: ExportMode,
  options: CsvOptions,
): ExportPreview => {
  const detailed = reportRows(input);
  const rows = mode === 'detailed' ? detailed : dailySummary(detailed, input.rounding);
  return { text: toCsv(rows, mode, options), rows: rows.length, totals: reportTotals(rows) };
};

/** `acme-website_2026-11-01_2026-11-30_detailed.csv`, or `all-projects_...` for every project. */
export const exportFileName = (
  project: string | null,
  from: LocalDate,
  to: LocalDate,
  mode: ExportMode,
): string => `${project ?? 'all-projects'}_${from}_${to}_${mode}.csv`;
