import { hours, table } from './format';

type Money = { readonly amount: string; readonly currency: string };
const money = (amounts: readonly Money[]): string =>
  amounts.map((item) => `${item.amount} ${item.currency}`).join(' + ');

type Running = {
  readonly projectName: string;
  readonly description: string;
  readonly start: string;
  readonly seconds: number;
};
type Total = {
  readonly seconds: number;
  readonly byProject: readonly { readonly name: string; readonly seconds: number }[];
};

/** The running entry and today's and this week's totals. */
export const presentStatus = (result: {
  readonly running: Running | null;
  readonly today: Total;
  readonly week: Total;
}): string => {
  const running =
    result.running === null
      ? 'Nothing running.'
      : `Running  ${result.running.description === '' ? '(no description)' : result.running.description} @${result.running.projectName}  ${hours(result.running.seconds)} since ${result.running.start.slice(11, 16)}`;
  const rows = (name: string, total: Total) => [
    [name, hours(total.seconds)],
    ...total.byProject.map((item) => [`  ${item.name}`, hours(item.seconds)]),
  ];
  return `${running}\n\n${table([...rows('Today', result.today), ...rows('This week', result.week)])}`;
};

type Group = {
  readonly label: string;
  readonly seconds: number;
  readonly billableSeconds: number;
  readonly amounts: readonly Money[];
};

/** Groups with hours, billable hours and amounts, then the totals. */
export const presentReport = (result: {
  readonly from: string;
  readonly to: string;
  readonly groupBy: string;
  readonly rounding: { readonly mode: string; readonly minutes: number; readonly scope: string };
  readonly groups: readonly Group[];
  readonly totals: {
    readonly seconds: number;
    readonly billableSeconds: number;
    readonly amounts: readonly Money[];
  };
}): string => {
  const rounding =
    result.rounding.mode === 'none'
      ? 'no rounding'
      : `rounded ${result.rounding.mode} to ${String(result.rounding.minutes)} min per ${result.rounding.scope}`;
  const header = `${result.from} to ${result.to}, by ${result.groupBy}, ${rounding}`;
  if (result.groups.length === 0) {
    return `${header}\n\nNo time tracked.`;
  }
  const rows = [
    [
      result.groupBy.charAt(0).toUpperCase() + result.groupBy.slice(1),
      'Hours',
      'Billable',
      'Amount',
    ],
    ...result.groups.map((group) => [
      group.label,
      hours(group.seconds),
      hours(group.billableSeconds),
      money(group.amounts),
    ]),
    [
      'Total',
      hours(result.totals.seconds),
      hours(result.totals.billableSeconds),
      money(result.totals.amounts),
    ],
  ];
  return `${header}\n\n${table(rows)}`;
};

/** Where the export went. */
export const presentExport = (result: {
  readonly path: string;
  readonly rows: number;
  readonly totals: { readonly seconds: number; readonly amounts: readonly Money[] };
}): string =>
  `Exported ${String(result.rows)} rows, ${hours(result.totals.seconds)}${result.totals.amounts.length === 0 ? '' : `, ${money(result.totals.amounts)}`}\n${result.path}`;
