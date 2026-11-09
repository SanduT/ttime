import type { Temporal } from 'temporal-polyfill';

import { MAX_FUTURE_START_SECONDS } from '../lib/constants';
import { compareTimestamps, formatTimestamp, type LocalDate, localDateOf } from '../lib/time';
import type { Client } from '../schema/client';
import type { DayFile, Entry, RunningEntry } from '../schema/entry';
import type { Project } from '../schema/project';
import type { IssueCode, IssueSeverity, VaultIssue } from './issues';

/** A loaded day file and where it came from. */
export type LoadedDay = { readonly date: LocalDate; readonly file: string; readonly day: DayFile };

/** Inputs to the cross-file checks. */
export type ValidationInput = {
  readonly days: readonly LoadedDay[];
  readonly projects: ReadonlyMap<string, Project>;
  readonly clients: ReadonlyMap<string, Client>;
  readonly running: RunningEntry | null;
  readonly runningFile: string;
  readonly now: Temporal.ZonedDateTime;
};

type Located = { readonly entry: Entry; readonly file: string; readonly index: number };

const issue = (
  code: IssueCode,
  severity: IssueSeverity,
  file: string,
  path: VaultIssue['path'],
  message: string,
): VaultIssue => ({ code, severity, file, path, message });

const entryChecks = (input: ValidationInput, located: Located): VaultIssue[] => {
  const { entry, file, index } = located;
  const at = ['entries', index];
  const found: VaultIssue[] = [];
  if (!input.projects.has(entry.project)) {
    found.push(
      issue(
        'entry.unknown_project',
        'warning',
        file,
        [...at, 'project'],
        `Unknown project "${entry.project}"`,
      ),
    );
  }
  const latestStart = formatTimestamp(input.now.add({ seconds: MAX_FUTURE_START_SECONDS }));
  if (compareTimestamps(entry.start, latestStart) > 0) {
    found.push(
      issue('entry.future_start', 'warning', file, [...at, 'start'], 'Starts in the future'),
    );
  }
  return found;
};

const duplicateChecks = (all: readonly Located[]): VaultIssue[] => {
  const seen = new Map<string, Located>();
  const found: VaultIssue[] = [];
  for (const located of all) {
    const first = seen.get(located.entry.id);
    if (first === undefined) {
      seen.set(located.entry.id, located);
      continue;
    }
    found.push(
      issue(
        'entry.duplicate_id',
        'error',
        located.file,
        ['entries', located.index, 'id'],
        `Entry ${located.entry.id} also exists in ${first.file}`,
      ),
    );
  }
  return found;
};

/** Overlaps are allowed but reported. Entries are compared across days (midnight crossings). */
const overlapChecks = (all: readonly Located[]): VaultIssue[] => {
  const sorted = [...all].sort((a, b) => compareTimestamps(a.entry.start, b.entry.start));
  const found: VaultIssue[] = [];
  let latest: Located | null = null;
  for (const located of sorted) {
    if (latest !== null && compareTimestamps(located.entry.start, latest.entry.end) < 0) {
      found.push(
        issue(
          'entry.overlap',
          'warning',
          located.file,
          ['entries', located.index],
          `Overlaps entry ${latest.entry.id}`,
        ),
      );
    }
    if (latest === null || compareTimestamps(located.entry.end, latest.entry.end) > 0) {
      latest = located;
    }
  }
  return found;
};

const dayChecks = (loaded: LoadedDay): VaultIssue[] => {
  const found: VaultIssue[] = [];
  if (loaded.day.date !== loaded.date) {
    found.push(
      issue(
        'file.misnamed',
        'warning',
        loaded.file,
        ['date'],
        `File is for ${loaded.date} but says ${loaded.day.date}`,
      ),
    );
  }
  loaded.day.entries.forEach((entry, index) => {
    if (localDateOf(entry.start) !== loaded.date) {
      found.push(
        issue(
          'entry.misplaced',
          'warning',
          loaded.file,
          ['entries', index, 'start'],
          `Starts on ${localDateOf(entry.start)}, so it belongs in that day's file`,
        ),
      );
    }
  });
  return found;
};

const projectChecks = (input: ValidationInput): VaultIssue[] =>
  [...input.projects.values()]
    .filter((project) => project.client !== undefined && !input.clients.has(project.client))
    .map((project) =>
      issue(
        'project.unknown_client',
        'warning',
        `projects/${project.id}.json`,
        ['client'],
        `Unknown client "${project.client ?? ''}"`,
      ),
    );

/** True when the running entry was already written to a day file (an interrupted stop). */
export const isRunningAlreadyStopped = (
  running: RunningEntry | null,
  days: readonly LoadedDay[],
): boolean =>
  running !== null && days.some((d) => d.day.entries.some((entry) => entry.id === running.id));

/** Cross-file checks on a loaded vault (FORMAT 4). Pure. */
export const validateVault = (input: ValidationInput): VaultIssue[] => {
  const all = input.days.flatMap((loaded) =>
    loaded.day.entries.map((entry, index): Located => ({ entry, file: loaded.file, index })),
  );
  const found = [
    ...input.days.flatMap(dayChecks),
    ...all.flatMap((located) => entryChecks(input, located)),
    ...duplicateChecks(all),
    ...overlapChecks(all),
    ...projectChecks(input),
  ];
  if (input.running !== null && !input.projects.has(input.running.project)) {
    found.push(
      issue(
        'entry.unknown_project',
        'warning',
        input.runningFile,
        ['entry', 'project'],
        `Unknown project "${input.running.project}"`,
      ),
    );
  }
  return found;
};
