import {
  type Entry,
  epochSeconds,
  type Project,
  type RunningEntry,
  secondsBetween,
  type VaultSnapshot,
} from '@ttime/core';

/** An entry as commands and tools return it. */
export type EntryView = {
  readonly id: string;
  readonly project: string;
  readonly projectName: string;
  readonly description: string;
  readonly start: string;
  /** Null while running. */
  readonly end: string | null;
  readonly seconds: number;
  readonly tags: readonly string[];
  readonly billable: boolean;
  readonly notes: readonly { readonly at: string; readonly text: string }[];
};

/** A project as commands and tools return it. */
export type ProjectView = {
  readonly id: string;
  readonly name: string;
  readonly client: string | null;
  readonly color: string;
  readonly billable: boolean;
  readonly rate: string | null;
  readonly status: string;
};

const nameOf = (projects: ReadonlyMap<string, Project>, id: string): string =>
  projects.get(id)?.name ?? id;

/** A finished entry with its project name and length. */
export const entryView = (entry: Entry, projects: ReadonlyMap<string, Project>): EntryView => ({
  id: entry.id,
  project: entry.project,
  projectName: nameOf(projects, entry.project),
  description: entry.description,
  start: entry.start,
  end: entry.end,
  seconds: secondsBetween(entry.start, entry.end),
  tags: entry.tags,
  billable: entry.billable,
  notes: entry.notes,
});

/** The running entry with its project name and elapsed time at `nowEpoch`. */
export const runningView = (
  entry: RunningEntry,
  projects: ReadonlyMap<string, Project>,
  nowEpoch: number,
): EntryView => ({
  id: entry.id,
  project: entry.project,
  projectName: nameOf(projects, entry.project),
  description: entry.description,
  start: entry.start,
  end: null,
  seconds: Math.max(0, nowEpoch - epochSeconds(entry.start)),
  tags: entry.tags,
  billable: entry.billable,
  notes: entry.notes,
});

/** A project with its rate as text (`60.00 EUR`). */
export const projectView = (project: Project): ProjectView => ({
  id: project.id,
  name: project.name,
  client: project.client ?? null,
  color: project.color,
  billable: project.billable,
  rate: project.rate === undefined ? null : `${project.rate.amount} ${project.rate.currency}`,
  status: project.status,
});

/** Every finished entry of a snapshot. */
export const allEntries = (snapshot: VaultSnapshot): Entry[] =>
  [...snapshot.days.values()].flatMap((day) => day.entries);
