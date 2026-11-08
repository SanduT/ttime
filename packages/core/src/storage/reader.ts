import type { Temporal } from 'temporal-polyfill';
import type { z } from 'zod';

import { jsonProblemLine } from '../lib/json-locate';
import { joinPath } from '../lib/path';
import { compareDates, type LocalDate } from '../lib/time';
import type { FsPort } from '../ports/fs-port';
import { type Client, clientSchema } from '../schema/client';
import { dayFileSchema, type RunningEntry, runningFileSchema } from '../schema/entry';
import { type Project, projectSchema } from '../schema/project';
import { type VaultConfig, vaultConfigSchema } from '../schema/vault-config';
import type { VaultIssue } from './issues';
import { DAY_FILE_PATTERN, RECORD_FILE_PATTERN, type VaultPaths, vaultPaths } from './paths';
import { readVaultFile } from './read-file';
import { isRunningAlreadyStopped, type LoadedDay, validateVault } from './validation';

/** Everything in a vault at one moment, plus the problems found while loading it. */
export type VaultSnapshot = {
  readonly config: VaultConfig | null;
  readonly clients: ReadonlyMap<string, Client>;
  readonly projects: ReadonlyMap<string, Project>;
  readonly days: ReadonlyMap<LocalDate, LoadedDay['day']>;
  /** The running entry; null when nothing runs or its stop was interrupted after the day write. */
  readonly running: RunningEntry | null;
  readonly issues: readonly VaultIssue[];
  /** True when a file has a newer schema than this app understands. */
  readonly readOnly: boolean;
};

/** Options for {@link loadSnapshot}. */
export type LoadOptions = {
  readonly fs: FsPort;
  readonly root: string;
  readonly now: Temporal.ZonedDateTime;
  readonly since?: LocalDate | undefined;
};

type RecordWithId = { readonly id: string };

const loadRecords = async <S extends z.ZodType<RecordWithId>>(
  fs: FsPort,
  paths: VaultPaths,
  dir: string,
  schema: S,
  issues: VaultIssue[],
): Promise<Map<string, z.output<S>>> => {
  const records = new Map<string, z.output<S>>();
  const names = (await fs.list(dir)).filter((e) => !e.isDir && e.name.endsWith('.json'));
  const results = await Promise.all(
    names.map(async ({ name }) => {
      const path = `${dir}/${name}`;
      return {
        name,
        file: paths.relative(path),
        read: await readVaultFile(fs, path, paths.relative(path), schema),
      };
    }),
  );
  for (const { name, file, read } of results) {
    const id = RECORD_FILE_PATTERN.exec(name)?.[1];
    if (read.status === 'invalid') {
      issues.push(...read.issues);
    } else if (read.status === 'ok' && read.value.id !== id) {
      issues.push({
        code: 'file.misnamed',
        severity: 'warning',
        file,
        path: ['id'],
        message: `File name does not match id "${read.value.id}"`,
      });
    } else if (read.status === 'ok') {
      records.set(read.value.id, read.value);
    }
  }
  return records;
};

const listDayFiles = async (
  fs: FsPort,
  paths: VaultPaths,
): Promise<{ date: LocalDate; path: string }[]> => {
  const found: { date: LocalDate; path: string }[] = [];
  for (const year of await fs.list(paths.entriesDir)) {
    const yearDir = `${paths.entriesDir}/${year.name}`;
    for (const month of year.isDir ? await fs.list(yearDir) : []) {
      const monthDir = `${yearDir}/${month.name}`;
      for (const file of month.isDir ? await fs.list(monthDir) : []) {
        const date = DAY_FILE_PATTERN.exec(file.name)?.[1];
        if (date !== undefined && !file.isDir) {
          found.push({ date, path: `${monthDir}/${file.name}` });
        }
      }
    }
  }
  return found;
};

const loadDays = async (
  fs: FsPort,
  paths: VaultPaths,
  since: LocalDate | undefined,
  issues: VaultIssue[],
): Promise<LoadedDay[]> => {
  const files = (await listDayFiles(fs, paths)).filter(
    (f) => since === undefined || compareDates(f.date, since) >= 0,
  );
  const reads = await Promise.all(
    files.map(async (f) => ({
      ...f,
      read: await readVaultFile(fs, f.path, paths.relative(f.path), dayFileSchema),
    })),
  );
  const days: LoadedDay[] = [];
  for (const { date, path, read } of reads) {
    if (read.status === 'invalid') {
      issues.push(...read.issues);
    } else if (read.status === 'ok') {
      days.push({ date, file: paths.relative(path), day: read.value });
    }
  }
  return days.sort((a, b) => compareDates(a.date, b.date));
};

/** Adds the line number to each issue whose file exists. Reads only files that have issues. */
const withLines = async (
  fs: FsPort,
  root: string,
  issues: readonly VaultIssue[],
): Promise<VaultIssue[]> => {
  const files = [...new Set(issues.map((issue) => issue.file))];
  const texts = new Map(
    await Promise.all(
      files.map(async (file) => [file, await fs.readText(joinPath(root, file))] as const),
    ),
  );
  return issues.map((issue) => {
    const text = texts.get(issue.file);
    return text === null || text === undefined
      ? issue
      : { ...issue, line: jsonProblemLine(text, issue.path) };
  });
};

/** Reads and validates the whole vault (or the days from `since` on). Never writes. */
export const loadSnapshot = async ({
  fs,
  root,
  now,
  since,
}: LoadOptions): Promise<VaultSnapshot> => {
  const paths = vaultPaths(root);
  const issues: VaultIssue[] = [];
  const [configRead, clients, projects, days, runningRead] = await Promise.all([
    readVaultFile(fs, paths.config, paths.relative(paths.config), vaultConfigSchema),
    loadRecords(fs, paths, paths.clientsDir, clientSchema, issues),
    loadRecords(fs, paths, paths.projectsDir, projectSchema, issues),
    loadDays(fs, paths, since, issues),
    readVaultFile(fs, paths.running, paths.relative(paths.running), runningFileSchema),
  ]);
  if (configRead.status === 'missing') {
    issues.push({
      code: 'vault.missing_config',
      severity: 'error',
      file: 'ttime.json',
      path: [],
      message: 'This folder has no ttime.json',
    });
  }
  for (const read of [configRead, runningRead]) {
    if (read.status === 'invalid') {
      issues.push(...read.issues);
    }
  }
  let running = runningRead.status === 'ok' ? runningRead.value.entry : null;
  if (isRunningAlreadyStopped(running, days)) {
    issues.push({
      code: 'running.already_stopped',
      severity: 'info',
      file: 'running.json',
      path: ['entry'],
      message: 'The last stop was interrupted; the entry is already saved and nothing is running',
    });
    running = null;
  }
  issues.push(
    ...validateVault({ days, projects, clients, running, runningFile: 'running.json', now }),
  );
  return {
    config: configRead.status === 'ok' ? configRead.value : null,
    clients,
    projects,
    days: new Map(days.map((d) => [d.date, d.day])),
    running,
    issues: await withLines(fs, root, issues),
    readOnly: issues.some((i) => i.code === 'file.newer_schema'),
  };
};
