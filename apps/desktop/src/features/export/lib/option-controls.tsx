import type { CsvOptions, Rounding } from '@ttime/core';

import { Checkbox } from '../../../shared/ui/checkbox';
import { Select } from '../../../shared/ui/field';

const MODES = ['none', 'up', 'down', 'nearest'] as const;
const MINUTES = [1, 5, 6, 10, 15, 30] as const;
const SELECT = 'w-36';

const modeOf = (value: string): Rounding['mode'] => MODES.find((mode) => mode === value) ?? 'none';
const minutesOf = (value: string): Rounding['minutes'] =>
  MINUTES.find((minutes) => String(minutes) === value) ?? 15;

type RoundingProps = {
  readonly rounding: Rounding;
  readonly onRounding: (rounding: Rounding) => void;
};

type CsvProps = {
  readonly csv: CsvOptions;
  readonly onCsv: (csv: CsvOptions) => void;
};

/** The rounding mode, interval and scope selects, without labels around them. */
export const roundingSelects = ({ rounding, onRounding }: RoundingProps) => {
  const round = (patch: Partial<Rounding>) => {
    onRounding({ ...rounding, ...patch });
  };
  const off = rounding.mode === 'none';
  return {
    mode: (
      <Select
        aria-label="Rounding"
        className={SELECT}
        value={rounding.mode}
        onChange={(event) => {
          round({ mode: modeOf(event.target.value) });
        }}
      >
        <option value="none">No rounding</option>
        <option value="up">Round up</option>
        <option value="down">Round down</option>
        <option value="nearest">Round to nearest</option>
      </Select>
    ),
    minutes: (
      <Select
        aria-label="Interval"
        className="w-28"
        disabled={off}
        value={String(rounding.minutes)}
        onChange={(event) => {
          round({ minutes: minutesOf(event.target.value) });
        }}
      >
        {MINUTES.map((minutes) => (
          <option key={minutes} value={minutes}>
            {minutes} min
          </option>
        ))}
      </Select>
    ),
    scope: (
      <Select
        aria-label="Apply to"
        className={SELECT}
        disabled={off}
        value={rounding.scope}
        onChange={(event) => {
          round({ scope: event.target.value === 'day' ? 'day' : 'entry' });
        }}
      >
        <option value="entry">Each entry</option>
        <option value="day">Each day total</option>
      </Select>
    ),
  };
};

/** The delimiter and decimal separator selects and the BOM checkbox, without labels. */
export const csvControls = ({ csv, onCsv }: CsvProps) => ({
  delimiter: (
    <Select
      aria-label="Delimiter"
      className={SELECT}
      value={csv.delimiter}
      onChange={(event) => {
        onCsv({ ...csv, delimiter: event.target.value === ';' ? ';' : ',' });
      }}
    >
      <option value=",">Comma</option>
      <option value=";">Semicolon</option>
    </Select>
  ),
  decimal: (
    <Select
      aria-label="Decimal separator"
      className={SELECT}
      value={csv.decimalSeparator}
      onChange={(event) => {
        onCsv({ ...csv, decimalSeparator: event.target.value === ',' ? ',' : '.' });
      }}
    >
      <option value=".">Dot (1.50)</option>
      <option value=",">Comma (1,50)</option>
    </Select>
  ),
  bom: (
    <Checkbox
      label="BOM for Excel"
      checked={csv.bom}
      onChange={(bom) => {
        onCsv({ ...csv, bom });
      }}
    />
  ),
});
