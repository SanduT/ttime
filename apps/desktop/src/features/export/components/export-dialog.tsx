import { formatElapsed, formatMoney } from '@ttime/core';

import { useVaultStore } from '../../../shared/store/vault-store';
import { Button } from '../../../shared/ui/button';
import { Dialog } from '../../../shared/ui/dialog';
import { Field, Select } from '../../../shared/ui/field';
import { type InitialPeriod, useExportForm } from '../hooks/use-export-form';
import { OpenExportsButton, SavedExport } from './export-files';
import { ExportOptions } from './export-options';
import { PeriodFields } from './period-fields';

type Props = {
  /** One project, or all projects when null. */
  readonly project: string | null;
  readonly initial: InitialPeriod;
  readonly onClose: () => void;
};

/** The export sheet (PRD 6.4): period, mode, rounding and CSV options, with a live preview. */
export const ExportDialog = ({ project, initial, onClose }: Props) => {
  const { form, set, range, today, preview, result, exportCsv } = useExportForm(project, initial);
  const name = useVaultStore((state) =>
    project === null ? 'All projects' : (state.snapshot?.projects.get(project)?.name ?? project),
  );
  return (
    <Dialog title={`Export ${name}`} wide onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void exportCsv();
        }}
      >
        <PeriodFields form={form} today={today} onChange={set} />
        <Field label="Rows">
          <Select
            className="w-56"
            value={form.mode}
            onChange={(event) => {
              set({ mode: event.target.value === 'daily' ? 'daily' : 'detailed' });
            }}
          >
            <option value="detailed">One per entry</option>
            <option value="daily">One per project and day</option>
          </Select>
        </Field>
        <ExportOptions
          rounding={form.rounding}
          csv={form.csv}
          onRounding={(rounding) => {
            set({ rounding });
          }}
          onCsv={(csv) => {
            set({ csv });
          }}
        />
        <p className="text-sm text-(--color-text-muted)">
          {preview === null || range === null
            ? 'Enter dates like 2026-11-01, with From on or before To.'
            : `${range.from} to ${range.to}: ${String(preview.rows)} rows, ${formatElapsed(preview.totals.seconds)} total${preview.totals.amounts.length === 0 ? '' : `, ${preview.totals.amounts.map(formatMoney).join(' + ')}`}`}
        </p>
        {result === null ? null : <SavedExport path={result.path} />}
        <div className="flex gap-2 pt-1">
          <Button type="submit" variant="primary" disabled={range === null}>
            Export CSV
          </Button>
          <Button onClick={onClose}>{result === null ? 'Cancel' : 'Done'}</Button>
          <span className="flex-1" />
          <OpenExportsButton />
        </div>
      </form>
    </Dialog>
  );
};
