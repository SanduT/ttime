import type { Temporal } from 'temporal-polyfill';
import type { z } from 'zod';

import { SCHEMA_VERSION } from '../lib/constants';
import { TTimeError } from '../lib/errors';
import { stringifyStable } from '../lib/json';
import { joinPath } from '../lib/path';
import { compareTimestamps, isLocalDate, type LocalDate } from '../lib/time';
import type { FsPort } from '../ports/fs-port';
import type { Change, ChangeKind, ChangeOp } from '../schema/changelog';
import { type Client, clientSchema } from '../schema/client';
import {
  type DayFile,
  dayFileSchema,
  type Note,
  type RunningFile,
  runningFileSchema,
  type TrashedEntry,
  trashedEntrySchema,
} from '../schema/entry';
import type { Actor } from '../schema/primitives';
import { type Project, projectSchema } from '../schema/project';
import { type VaultConfig, vaultConfigSchema } from '../schema/vault-config';
import { listChangelogMonths, readChangelogMonth } from './changelog';
import { DAY_FILE_PATTERN, RECORD_FILE_PATTERN, type VaultPaths } from './paths';
import { readVaultFile } from './read-file';

/** A change to record in the changelog. */
export type ChangeInput = {
  readonly op: ChangeOp;
  readonly kind: ChangeKind;
  readonly id: string;
  readonly before: unknown;
  readonly after: unknown;
  /** The batch this change reverts, for undo batches. */
  readonly undoes?: string;
};

/** A pending file operation, applied in order at commit. */
type PendingOp =
  | { readonly type: 'write'; readonly path: string; readonly text: string }
  | { readonly type: 'remove'; readonly path: string };

/**
 * One read-modify-write on the vault, inside the lock. Reads always come from disk (or from this
 * transaction's own pending writes). Writes are buffered and applied in call order at commit.
 * A path can only be written after it was read in the same transaction, and reading a file that
 * fails to parse throws, so broken files are never overwritten.
 */
export type VaultTx = {
  /** One instant for the whole transaction, so a switch stops and starts at the same second. */
  readonly now: Temporal.ZonedDateTime;
  readonly batch: string;
  readonly actor: Actor;
  readonly readConfig: () => Promise<VaultConfig>;
  readonly writeConfig: (config: VaultConfig) => void;
  /** The changes of batch `batch`, in the order they were made; empty when unknown. */
  readonly readBatch: (batch: string) => Promise<readonly Change[]>;
  readonly listDays: () => Promise<readonly LocalDate[]>;
  readonly readDay: (date: LocalDate) => Promise<DayFile>;
  readonly writeDay: (day: DayFile) => void;
  readonly readRunning: () => Promise<RunningFile>;
  readonly writeRunning: (running: RunningFile) => void;
  readonly listProjectIds: () => Promise<readonly string[]>;
  readonly readProject: (id: string) => Promise<Project | null>;
  readonly writeProject: (project: Project) => void;
  readonly listClientIds: () => Promise<readonly string[]>;
  readonly readClient: (id: string) => Promise<Client | null>;
  readonly writeClient: (client: Client) => void;
  readonly readTrash: (id: string) => Promise<TrashedEntry | null>;
  readonly writeTrash: (trashed: TrashedEntry) => void;
  readonly removeTrash: (id: string) => void;
  readonly record: (change: ChangeInput) => void;
  /**
   * Writes `exports/<fileName>`, replacing an earlier export of the same name. Exports are
   * output, not vault data: no schema and no changelog line.
   */
  readonly writeExport: (fileName: string, text: string) => void;
};

/** What a transaction leaves to commit. */
export type TxState = {
  readonly pending: readonly PendingOp[];
  readonly changes: readonly ChangeInput[];
};

/** Dependencies of {@link createTx}. */
export type TxDeps = {
  readonly fs: FsPort;
  readonly paths: VaultPaths;
  readonly now: Temporal.ZonedDateTime;
  readonly batch: string;
  readonly actor: Actor;
};

/** An export file name: no folders, ends in `.csv`. */
const EXPORT_NAME = /^[\w.-]+\.csv$/;

const byNoteTime = (a: Note, b: Note): number => compareTimestamps(a.at, b.at);

const sortDay = (day: DayFile): DayFile => ({
  ...day,
  entries: day.entries
    .map((entry) => ({ ...entry, notes: [...entry.notes].sort(byNoteTime) }))
    .sort((a, b) => compareTimestamps(a.start, b.start) || a.id.localeCompare(b.id)),
});

const sortRunning = (running: RunningFile): RunningFile =>
  running.entry === null
    ? running
    : { ...running, entry: { ...running.entry, notes: [...running.entry.notes].sort(byNoteTime) } };

const listMatching = async (fs: FsPort, dir: string, pattern: RegExp): Promise<string[]> =>
  (await fs.list(dir))
    .filter((entry) => !entry.isDir)
    .map((entry) => pattern.exec(entry.name)?.[1])
    .filter((name): name is string => name !== undefined)
    .sort();

/**
 * Buffered, validated file access for one transaction. Enforces the two storage invariants:
 * a path is written only after it was read here, and a file that fails to parse is never read
 * into a write (reading it throws).
 */
const createFileAccess = ({ fs, paths }: Pick<TxDeps, 'fs' | 'paths'>) => {
  const read = new Set<string>();
  const overlay = new Map<string, { value: unknown } | null>();
  const pending: PendingOp[] = [];
  const requireRead = (path: string, action: string): void => {
    if (!read.has(path) && !overlay.has(path)) {
      throw new TTimeError('internal.invariant', `${action} without read: ${paths.relative(path)}`);
    }
  };

  const readFile = async <S extends z.ZodType>(path: string, schema: S) => {
    const buffered = overlay.get(path);
    if (buffered !== undefined) {
      return buffered === null ? null : schema.parse(buffered.value);
    }
    const result = await readVaultFile(fs, path, paths.relative(path), schema);
    if (result.status === 'invalid') {
      const [first] = result.issues;
      const code = first?.code === 'file.newer_schema' ? 'vault.read_only' : 'vault.parse_failed';
      throw new TTimeError(code, `${paths.relative(path)} is invalid: ${first?.message ?? ''}`, {
        details: { file: paths.relative(path), issues: result.issues },
      });
    }
    read.add(path);
    return result.status === 'missing' ? null : result.value;
  };

  const write = <S extends z.ZodType>(path: string, schema: S, value: z.input<S>): void => {
    requireRead(path, 'Write');
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      throw new TTimeError('input.invalid', parsed.error.issues[0]?.message ?? 'Invalid record', {
        details: { file: paths.relative(path), issues: parsed.error.issues },
      });
    }
    overlay.set(path, { value: parsed.data });
    pending.push({ type: 'write', path, text: stringifyStable(parsed.data) });
  };

  const remove = (path: string): void => {
    requireRead(path, 'Remove');
    overlay.set(path, null);
    pending.push({ type: 'remove', path });
  };

  return { readFile, write, remove, pending };
};

const requireDate = (date: LocalDate): void => {
  if (!isLocalDate(date)) {
    throw new TTimeError('input.invalid', `Invalid date: ${date}`);
  }
};

const listDayDates = async (fs: FsPort, entriesDir: string): Promise<LocalDate[]> => {
  const dates: LocalDate[] = [];
  for (const year of await fs.list(entriesDir)) {
    for (const month of year.isDir ? await fs.list(`${entriesDir}/${year.name}`) : []) {
      const dir = `${entriesDir}/${year.name}/${month.name}`;
      dates.push(...(month.isDir ? await listMatching(fs, dir, DAY_FILE_PATTERN) : []));
    }
  }
  return dates.sort();
};

/** Creates a transaction and the state its commit needs. */
export const createTx = (deps: TxDeps): { readonly tx: VaultTx; readonly state: TxState } => {
  const { fs, paths } = deps;
  const files = createFileAccess(deps);
  const changes: ChangeInput[] = [];

  const tx: VaultTx = {
    now: deps.now,
    batch: deps.batch,
    actor: deps.actor,
    readConfig: async () => {
      const config = await files.readFile(paths.config, vaultConfigSchema);
      if (config === null) {
        throw new TTimeError('vault.missing_config', `No ttime.json in ${paths.root}`);
      }
      return config;
    },
    writeConfig: (config) => {
      files.write(paths.config, vaultConfigSchema, config);
    },
    readBatch: async (batch) => {
      for (const month of await listChangelogMonths(fs, paths)) {
        const changes = (await readChangelogMonth(fs, paths, month)).filter(
          (change) => change.batch === batch,
        );
        if (changes.length > 0) {
          return changes;
        }
      }
      return [];
    },
    listDays: () => listDayDates(fs, paths.entriesDir),
    readDay: async (date) => {
      requireDate(date);
      const day = await files.readFile(paths.day(date), dayFileSchema);
      return day ?? { schema: SCHEMA_VERSION, date, entries: [] };
    },
    writeDay: (day) => {
      files.write(paths.day(day.date), dayFileSchema, sortDay(day));
    },
    readRunning: async () =>
      (await files.readFile(paths.running, runningFileSchema)) ?? {
        schema: SCHEMA_VERSION,
        entry: null,
      },
    writeRunning: (running) => {
      files.write(paths.running, runningFileSchema, sortRunning(running));
    },
    listProjectIds: () => listMatching(fs, paths.projectsDir, RECORD_FILE_PATTERN),
    readProject: (id) => files.readFile(paths.project(id), projectSchema),
    writeProject: (project) => {
      files.write(paths.project(project.id), projectSchema, project);
    },
    listClientIds: () => listMatching(fs, paths.clientsDir, RECORD_FILE_PATTERN),
    readClient: (id) => files.readFile(paths.client(id), clientSchema),
    writeClient: (client) => {
      files.write(paths.client(client.id), clientSchema, client);
    },
    readTrash: (id) => files.readFile(paths.trashEntry(id), trashedEntrySchema),
    writeTrash: (trashed) => {
      files.write(paths.trashEntry(trashed.entry.id), trashedEntrySchema, trashed);
    },
    removeTrash: (id) => {
      files.remove(paths.trashEntry(id));
    },
    record: (change) => {
      changes.push(change);
    },
    writeExport: (fileName, text) => {
      if (!EXPORT_NAME.test(fileName)) {
        throw new TTimeError('input.invalid', `Invalid export file name: ${fileName}`);
      }
      files.pending.push({ type: 'write', path: joinPath(paths.exportsDir, fileName), text });
    },
  };
  return { tx, state: { pending: files.pending, changes } };
};
