import {
  buildExport,
  type CsvOptions,
  type DateRange,
  DEFAULT_SETTINGS,
  type ExportMode,
  type ExportPreview,
  type ExportResult,
  isLocalDate,
  type LocalDate,
  monthRange,
  type PeriodPreset,
  presetRange,
  type Rounding,
} from '@ttime/core';
import { useMemo, useState } from 'react';

import { useNow } from '../../../shared/hooks/use-now';
import { useVaultAction } from '../../../shared/hooks/use-vault-action';
import { useVaultStore } from '../../../shared/store/vault-store';

/** How the period is chosen: a preset, one calendar month, or custom dates. */
export type PeriodKind = PeriodPreset | 'month' | 'custom';

/** What the export sheet edits. */
export type ExportForm = {
  readonly period: PeriodKind;
  /** `yyyy-mm`, for `period: 'month'`. */
  readonly month: string;
  /** Typed dates, for `period: 'custom'`. */
  readonly from: string;
  readonly to: string;
  readonly mode: ExportMode;
  readonly rounding: Rounding;
  readonly csv: CsvOptions;
};

/** The sheet's state, a live preview, and the export action. */
/** The dates the form means, or null when custom dates are invalid. */
const rangeOf = (form: ExportForm, today: LocalDate, weekStartsOn: WeekStart): DateRange | null => {
  if (form.period === 'month') {
    return monthRange(form.month);
  }
  if (form.period !== 'custom') {
    return presetRange(form.period, today, weekStartsOn);
  }
  const valid = isLocalDate(form.from) && isLocalDate(form.to) && form.from <= form.to;
  return valid ? { from: form.from, to: form.to } : null;
};

type WeekStart = Parameters<typeof presetRange>[2];

/** Where the sheet starts: a preset, or custom dates. */
export type InitialPeriod =
  | { readonly kind: PeriodPreset }
  | { readonly kind: 'custom'; readonly from: LocalDate; readonly to: LocalDate };

export const useExportForm = (project: string | null, initial: InitialPeriod) => {
  const snapshot = useVaultStore((state) => state.snapshot);
  const settings = snapshot?.config?.settings ?? DEFAULT_SETTINGS;
  const now = useNow();
  const zone = now.timeZoneId;
  const today = now.toPlainDate().toString();
  const [form, setForm] = useState<ExportForm>(() => ({
    period: initial.kind,
    month: today.slice(0, 7),
    from: initial.kind === 'custom' ? initial.from : today,
    to: initial.kind === 'custom' ? initial.to : today,
    mode: 'detailed',
    rounding: { ...settings.rounding },
    csv: { ...settings.csv },
  }));
  const [result, setResult] = useState<ExportResult | null>(null);
  const act = useVaultAction();
  const range = rangeOf(form, today, settings.weekStartsOn);
  const preview = useMemo((): ExportPreview | null => {
    if (snapshot === null || range === null) {
      return null;
    }
    const input = {
      entries: [...snapshot.days.values()].flatMap((day) => day.entries),
      ...range,
      project,
      projects: snapshot.projects,
      clients: snapshot.clients,
      timeZone: zone,
      dayStartsAt: settings.dayStartsAt,
      rounding: form.rounding,
    };
    return buildExport(input, form.mode, form.csv);
  }, [snapshot, range, form.mode, form.rounding, form.csv, project, zone, settings.dayStartsAt]);
  const set = (patch: Partial<ExportForm>) => {
    setForm((current) => ({ ...current, ...patch }));
    setResult(null);
  };
  const exportCsv = async () => {
    if (range === null) {
      return;
    }
    const { mode, rounding, csv } = form;
    const written = await act('Export CSV', ({ exports }) =>
      exports.exportCsv({ ...range, mode, rounding, csv, project }),
    );
    setResult(written ?? null);
  };
  return { form, set, range, today, preview, result, exportCsv };
};
