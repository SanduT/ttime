import { type LocalDate, recentMonths } from '@ttime/core';

import { Field, Select, TextInput } from '../../../shared/ui/field';
import type { ExportForm, PeriodKind } from '../hooks/use-export-form';

type Props = {
  readonly form: ExportForm;
  readonly today: LocalDate;
  readonly onChange: (patch: Partial<ExportForm>) => void;
};

const KINDS: readonly { readonly id: PeriodKind; readonly label: string }[] = [
  { id: 'this-week', label: 'This week' },
  { id: 'last-week', label: 'Last week' },
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'month', label: 'Month…' },
  { id: 'custom', label: 'Custom…' },
];

const kindOf = (value: string): PeriodKind =>
  KINDS.find((kind) => kind.id === value)?.id ?? 'this-month';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** `2026-11` as `November 2026`. */
const monthLabel = (month: string): string =>
  `${MONTHS[Number(month.slice(5, 7)) - 1] ?? month} ${month.slice(0, 4)}`;

/** Period: a preset, one calendar month from a list, or custom From and To dates. */
export const PeriodFields = ({ form, today, onChange }: Props) => (
  <div className="flex gap-2">
    <Field label="Period">
      <Select
        value={form.period}
        onChange={(event) => {
          onChange({ period: kindOf(event.target.value) });
        }}
      >
        {KINDS.map((kind) => (
          <option key={kind.id} value={kind.id}>
            {kind.label}
          </option>
        ))}
      </Select>
    </Field>
    {form.period === 'month' ? (
      <Field label="Month">
        <Select
          value={form.month}
          onChange={(event) => {
            onChange({ month: event.target.value });
          }}
        >
          {recentMonths(today, 24).map((month) => (
            <option key={month} value={month}>
              {monthLabel(month)}
            </option>
          ))}
        </Select>
      </Field>
    ) : null}
    {form.period === 'custom' ? (
      <>
        <Field label="From">
          <TextInput
            className="w-32 tabular-nums"
            value={form.from}
            onChange={(event) => {
              onChange({ from: event.target.value });
            }}
          />
        </Field>
        <Field label="To">
          <TextInput
            className="w-32 tabular-nums"
            value={form.to}
            onChange={(event) => {
              onChange({ to: event.target.value });
            }}
          />
        </Field>
      </>
    ) : null}
  </div>
);
