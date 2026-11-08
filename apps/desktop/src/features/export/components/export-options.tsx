import type { CsvOptions, Rounding } from '@ttime/core';

import { Field } from '../../../shared/ui/field';
import { csvControls, roundingSelects } from '../lib/option-controls';

type Props = {
  readonly rounding: Rounding;
  readonly onRounding: (rounding: Rounding) => void;
  readonly csv: CsvOptions;
  readonly onCsv: (csv: CsvOptions) => void;
};

/** The export sheet's rounding and CSV options, each with its label above. */
export const ExportOptions = (props: Props) => {
  const rounding = roundingSelects(props);
  const csv = csvControls(props);
  return (
    <>
      <div className="flex gap-2">
        <Field label="Rounding">{rounding.mode}</Field>
        <Field label="Interval">{rounding.minutes}</Field>
        <Field label="Apply to">{rounding.scope}</Field>
      </div>
      <div className="flex items-end gap-2">
        <Field label="Delimiter">{csv.delimiter}</Field>
        <Field label="Decimal separator">{csv.decimal}</Field>
        {csv.bom}
      </div>
    </>
  );
};
