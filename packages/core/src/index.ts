// @ttime/core public API. Other packages import only from here.

export { Temporal } from 'temporal-polyfill';

// lib
export { LOCK_STALE_MS, MAX_FUTURE_START_SECONDS, SCHEMA_VERSION } from './lib/constants';
export { formatElapsed } from './lib/duration';
export { type ErrorCode, isTTimeError, TTimeError, type TTimeErrorOptions } from './lib/errors';
export { parseJson, stringifyStable, tryParseJson } from './lib/json';
export { slugify, uniqueSlug } from './lib/slug';
export {
  addDays,
  compareTimestamps,
  epochSeconds,
  formatTimestamp,
  isLocalDate,
  isTimestamp,
  type LocalDate,
  localDateOf,
  secondsBetween,
  type Timestamp,
  timestampOn,
  toZoned,
} from './lib/time';

// schema
export { type Change, type ChangeKind, type ChangeOp, changeSchema } from './schema/changelog';
export { type Client, clientSchema } from './schema/client';
export {
  type DayFile,
  dayFileSchema,
  type Entry,
  entrySchema,
  type Note,
  type RunningEntry,
  runningEntrySchema,
  type RunningFile,
  runningFileSchema,
  type TrashedEntry,
  trashedEntrySchema,
} from './schema/entry';
export { type Actor, type Money } from './schema/primitives';
export { type Project, projectSchema } from './schema/project';
export {
  DEFAULT_SETTINGS,
  type VaultConfig,
  vaultConfigSchema,
  type VaultSettings,
} from './schema/vault-config';

// ports
export type { ClockPort } from './ports/clock-port';
export type { EnvPort } from './ports/env-port';
export type { DirEntry, FileStat, FsPort } from './ports/fs-port';
export { createUlidGenerator, type IdGenerator, type UlidGeneratorDeps } from './ports/id-port';
export type { LogContext, Logger } from './ports/logger';
export { createManualClock, type ManualClock } from './ports/manual-clock';
export {
  createMemoryFs,
  type FsOperation,
  type MemoryFs,
  type MemoryFsOptions,
} from './ports/memory-fs';

// storage
export {
  type AppConfig,
  appConfigPath,
  appConfigSchema,
  readAppConfig,
  writeAppConfig,
} from './storage/app-config';
export type { IssueCode, IssueSeverity, VaultIssue } from './storage/issues';
export { lockDirFor } from './storage/lock';
export type { VaultSnapshot } from './storage/reader';
export type { ChangeInput, VaultTx } from './storage/transaction';
export {
  createVault,
  initVault,
  type TxResult,
  type Vault,
  type VaultDeps,
  type WrittenFile,
} from './storage/vault';

// domain
export {
  type ClientPatch,
  type ClientService,
  type ClientServiceDeps,
  type CreateClientInput,
  createClientService,
} from './domain/client-service';
export {
  buildExport,
  type CsvOptions,
  exportFileName,
  type ExportMode,
  type ExportPreview,
  toCsv,
} from './domain/csv-export';
export {
  type CurrentTotals,
  currentTotals,
  type CurrentTotalsInput,
  type ProjectTotal,
} from './domain/current-totals';
export {
  type DayRow,
  type DayView,
  dayView,
  type DayViewInput,
  type Gap,
  MIN_GAP_SECONDS,
} from './domain/day-view';
export {
  type CreateEntryInput,
  createEntryService,
  type EntryPatch,
  type EntryService,
  type EntryServiceDeps,
} from './domain/entry-service';
export {
  createExportService,
  type ExportRequest,
  type ExportResult,
  type ExportService,
  type ExportServiceDeps,
} from './domain/export-service';
export {
  type DateRange,
  monthRange,
  type PeriodPreset,
  presetRange,
  recentMonths,
} from './domain/periods';
export { type MatchKind, matchProjects, type ProjectMatch } from './domain/project-matcher';
export {
  type CreateProjectInput,
  createProjectService,
  PROJECT_COLORS,
  type ProjectPatch,
  type ProjectService,
  type ProjectServiceDeps,
} from './domain/project-service';
export { type ProjectHours, projectTotals, type ProjectTotalsInput } from './domain/project-totals';
export {
  createQuickActions,
  type QuickActions,
  type QuickActionsDeps,
} from './domain/quick-actions';
export {
  parseQuickInput,
  type QuickInput,
  resolveStart,
  type StartSpec,
} from './domain/quick-input-parser';
export {
  planQuickInput,
  type QuickContext,
  type QuickPlan,
  type QuickProject,
} from './domain/quick-plan';
export {
  filterRecent,
  latestEntry,
  recentEntries,
  type RecentEntry,
} from './domain/recent-entries';
export {
  dailySummary,
  type ReportInput,
  type ReportRow,
  reportRows,
  type ReportTotals,
  reportTotals,
  type SummaryRow,
} from './domain/report';
export { type Rounding, roundSeconds } from './domain/rounding';
export type { OnConflict } from './domain/running';
export {
  createSettingsService,
  type SettingsPatch,
  type SettingsService,
  type SettingsServiceDeps,
} from './domain/settings-service';
export { type DaySegment, splitByDay, type SplitOptions } from './domain/split-by-day';
export {
  createTimerService,
  type RunningPatch,
  type StartInput,
  type StartResult,
  type TimerService,
  type TimerServiceDeps,
} from './domain/timer-service';
export { type Batch, type UndoState } from './domain/undo-history';
export { createUndoService, type UndoService, type UndoServiceDeps } from './domain/undo-service';
export { amountFor, decimalHours, formatMoney, parseAmount, sumMoney } from './lib/money';

// testing
export { buildClient, buildDay, buildEntry, buildProject, buildRunning } from './testing/builders';
export { createDomainTestVault, type DomainTestVault } from './testing/domain-vault';
export { errorCodeOf } from './testing/errors';
export {
  createRecordingLogger,
  createTestVault,
  type RecordingLogger,
  type TestVault,
} from './testing/test-vault';
