import { addDays, type LocalDate } from '../lib/time';
import type { Logger } from '../ports/logger';
import { DEFAULT_SETTINGS } from '../schema/vault-config';
import type { Vault } from '../storage/vault';
import { buildExport, type CsvOptions, exportFileName, type ExportMode } from './csv-export';
import type { ReportTotals } from './report';
import type { Rounding } from './rounding';

/** What to export. Rounding and CSV options default to the vault settings. */
export type ExportRequest = {
  readonly from: LocalDate;
  readonly to: LocalDate;
  /** One project, or all when null. */
  readonly project: string | null;
  readonly mode: ExportMode;
  readonly rounding?: Rounding;
  readonly csv?: CsvOptions;
};

/** A written export. */
export type ExportResult = {
  /** Vault-relative path, `exports/<name>.csv`. */
  readonly path: string;
  readonly rows: number;
  readonly totals: ReportTotals;
};

/** Dependencies of {@link createExportService}. */
export type ExportServiceDeps = {
  readonly vault: Vault;
  readonly timeZone: () => string;
  readonly logger: Logger;
};

/** Writes CSV exports into the vault's `exports/` folder (PRD 6.4). */
export type ExportService = {
  readonly exportCsv: (request: ExportRequest) => Promise<ExportResult>;
};

/** Creates the export service. */
export const createExportService = ({
  vault,
  timeZone,
  logger,
}: ExportServiceDeps): ExportService => ({
  exportCsv: async (request) => {
    // The day before `from` can hold an entry that runs past midnight into the period.
    const snapshot = await vault.read({ since: addDays(request.from, -1) });
    const settings = snapshot.config?.settings ?? DEFAULT_SETTINGS;
    const rounding = request.rounding ?? settings.rounding;
    const preview = buildExport(
      {
        entries: [...snapshot.days.values()].flatMap((day) => day.entries),
        from: request.from,
        to: request.to,
        project: request.project,
        projects: snapshot.projects,
        clients: snapshot.clients,
        timeZone: timeZone(),
        dayStartsAt: settings.dayStartsAt,
        rounding,
      },
      request.mode,
      request.csv ?? settings.csv,
    );
    const name = exportFileName(request.project, request.from, request.to, request.mode);
    await vault.transact((tx) => {
      tx.writeExport(name, preview.text);
      return Promise.resolve();
    });
    logger.info('export.csv', { rows: preview.rows, mode: request.mode });
    return { path: `exports/${name}`, rows: preview.rows, totals: preview.totals };
  },
});
