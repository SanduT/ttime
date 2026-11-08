import type { Rounding } from '@ttime/core';

import { Field, Select } from '../../../shared/ui/field';
import type { ExportForm } from '../hooks/use-export-form';

type Props = {
  readonly form: ExportForm;
  readonly onChange: (patch: Partial<ExportForm>) => void;
};

const MODES = ['none', 'up', 'down', 'nearest'] as const;
const MINUTES = [1, 5, 6, 10, 15, 30] as const;

const modeOf = (value: string): Rounding['mode'] => MODES.find((mode) => mode === value) ?? 'none';
const minutesOf = (value: string): Rounding['minutes'] =>
  MINUTES.find((minutes) => String(minutes) === value) ?? 15;

/** CSV locale: delimiter, decimal separator and BOM. */
const CsvFields = ({ form, onChange }: Props) => (
  <div className="flex items-end gap-2">
    <Field label="Delimiter">
      <Select
        value={form.csv.delimiter}
        onChange={(event) => {
          onChange({ csv: { ...form.csv, delimiter: event.target.value === ';' ? ';' : ',' } });
        }}
      >
        <option value=",">Comma</option>
        <option value=";">Semicolon</option>
      </Select>
    </Field>
    <Field label="Decimal separator">
      <Select
        value={form.csv.decimalSeparator}
        onChange={(event) => {
          onChange({
            csv: { ...form.csv, decimalSeparator: event.target.value === ',' ? ',' : '.' },
          });
        }}
      >
        <option value=".">Dot (1.50)</option>
        <option value=",">Comma (1,50)</option>
      </Select>
    </Field>
    <label className="flex items-center gap-2 pb-1.5 text-sm">
      <input
        type="checkbox"
        checked={form.csv.bom}
        onChange={(event) => {
          onChange({ csv: { ...form.csv, bom: event.target.checked } });
        }}
      />
      BOM for Excel
    </label>
  </div>
);

/** Rounding (mode, interval, scope) and CSV locale (delimiter, decimal separator, BOM). */
export const ExportOptions = ({ form, onChange }: Props) => {
  const rounding = (patch: Partial<Rounding>) => {
    onChange({ rounding: { ...form.rounding, ...patch } });
  };
  return (
    <>
      <div className="flex gap-2">
        <Field label="Rounding">
          <Select
            value={form.rounding.mode}
            onChange={(event) => {
              rounding({ mode: modeOf(event.target.value) });
            }}
          >
            <option value="none">None</option>
            <option value="up">Up</option>
            <option value="down">Down</option>
            <option value="nearest">Nearest</option>
          </Select>
        </Field>
        <Field label="Interval">
          <Select
            disabled={form.rounding.mode === 'none'}
            value={String(form.rounding.minutes)}
            onChange={(event) => {
              rounding({ minutes: minutesOf(event.target.value) });
            }}
          >
            {MINUTES.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} min
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Apply to">
          <Select
            disabled={form.rounding.mode === 'none'}
            value={form.rounding.scope}
            onChange={(event) => {
              rounding({ scope: event.target.value === 'day' ? 'day' : 'entry' });
            }}
          >
            <option value="entry">Each entry</option>
            <option value="day">Each day total</option>
          </Select>
        </Field>
      </div>
      <CsvFields form={form} onChange={onChange} />
    </>
  );
};
