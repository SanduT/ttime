// @ttime/core public API. Other packages import only from here.

export { Temporal } from 'temporal-polyfill';

// lib
export { LOCK_STALE_MS, MAX_FUTURE_START_SECONDS, SCHEMA_VERSION } from './lib/constants';
export { type ErrorCode, isTTimeError, TTimeError, type TTimeErrorOptions } from './lib/errors';
export { parseJson, stringifyStable, tryParseJson } from './lib/json';
export { slugify, uniqueSlug } from './lib/slug';
export {
  compareTimestamps,
  formatTimestamp,
  isLocalDate,
  isTimestamp,
  type LocalDate,
  localDateOf,
  secondsBetween,
  type Timestamp,
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

// testing
export { buildClient, buildDay, buildEntry, buildProject, buildRunning } from './testing/builders';
export {
  createRecordingLogger,
  createTestVault,
  type RecordingLogger,
  type TestVault,
} from './testing/test-vault';
