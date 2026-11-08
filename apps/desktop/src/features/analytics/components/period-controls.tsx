import { type DateRange, isLocalDate } from '@ttime/core';

import { Button } from '../../../shared/ui/button';
import { CommitInput } from '../../../shared/ui/commit-input';
import { Select } from '../../../shared/ui/field';
import { type AnalyticsPeriod, useAnalyticsStore } from '../store/analytics-store';

const PERIODS: readonly { readonly id: AnalyticsPeriod; readonly label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'this-week', label: 'This week' },
  { id: 'last-week', label: 'Last week' },
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'this-year', label: 'This year' },
  { id: 'custom', label: 'Custom…' },
];

const periodOf = (value: string): AnalyticsPeriod =>
  PERIODS.find((period) => period.id === value)?.id ?? 'this-week';

/** Period select, previous and next, and From and To dates for a custom period. */
export const PeriodControls = ({ range }: { readonly range: DateRange }) => {
  const { period, choose, shift } = useAnalyticsStore();
  const setDate = (edge: 'from' | 'to', value: string) => {
    if (isLocalDate(value)) {
      const next = { ...range, [edge]: value };
      choose('custom', next.from <= next.to ? next : { from: value, to: value });
    }
  };
  return (
    <div className="flex items-center gap-2">
      <Select
        aria-label="Period"
        className="w-36"
        value={period}
        onChange={(event) => {
          const next = periodOf(event.target.value);
          choose(next, next === 'custom' ? range : undefined);
        }}
      >
        {PERIODS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </Select>
      <Button
        aria-label="Previous period"
        onClick={() => {
          shift(-1);
        }}
      >
        ←
      </Button>
      <Button
        aria-label="Next period"
        onClick={() => {
          shift(1);
        }}
      >
        →
      </Button>
      {period === 'custom' ? (
        <>
          <CommitInput
            label="From"
            className="w-28 text-center tabular-nums"
            value={range.from}
            onCommit={(value) => {
              setDate('from', value);
            }}
          />
          <span className="text-sm text-(--color-text-muted)">to</span>
          <CommitInput
            label="To"
            className="w-28 text-center tabular-nums"
            value={range.to}
            onCommit={(value) => {
              setDate('to', value);
            }}
          />
        </>
      ) : (
        <span className="text-sm text-(--color-text-muted) tabular-nums">
          {range.from === range.to ? range.from : `${range.from} to ${range.to}`}
        </span>
      )}
    </div>
  );
};
