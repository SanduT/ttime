import { formatElapsed, formatMoney, type ReportTotals } from '@ttime/core';

const Stat = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <div className="flex flex-col gap-1 rounded-lg border border-(--color-border) px-4 py-3">
    <span className="text-xs text-(--color-text-muted)">{label}</span>
    <span className="text-xl font-semibold tabular-nums">{value}</span>
  </div>
);

/** Hours, billable hours and the amount (when rates exist) for the period. */
export const Totals = ({ totals }: { readonly totals: ReportTotals }) => (
  <div className="grid grid-cols-3 gap-3">
    <Stat label="Hours" value={formatElapsed(totals.seconds)} />
    <Stat label="Billable" value={formatElapsed(totals.billableSeconds)} />
    <Stat
      label="Amount"
      value={totals.amounts.length === 0 ? '–' : totals.amounts.map(formatMoney).join(' + ')}
    />
  </div>
);
