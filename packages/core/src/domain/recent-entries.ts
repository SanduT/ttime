import { compareTimestamps, type Timestamp } from '../lib/time';
import type { Entry } from '../schema/entry';
import type { Project } from '../schema/project';
import { matchProjects } from './project-matcher';
import type { QuickInput } from './quick-input-parser';

/** A unique project and description pair from history, for one-key continue. */
export type RecentEntry = {
  readonly project: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly billable: boolean;
  /** Start of the latest entry with this pair. */
  readonly lastStart: Timestamp;
};

/** Default number of recent items. */
const DEFAULT_LIMIT = 50;

const fold = (text: string): string => text.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Unique project and description pairs, newest first. Descriptions that differ only in case or
 * spacing count as one; the latest entry supplies the text, tags and billable. Pure.
 */
export const recentEntries = (
  entries: readonly Entry[],
  options: { readonly limit?: number } = {},
): RecentEntry[] => {
  const seen = new Set<string>();
  const items: RecentEntry[] = [];
  const newestFirst = [...entries].sort((a, b) => compareTimestamps(b.start, a.start));
  for (const entry of newestFirst) {
    const key = `${entry.project}\u0000${fold(entry.description)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    items.push({
      project: entry.project,
      description: entry.description,
      tags: entry.tags,
      billable: entry.billable,
      lastStart: entry.start,
    });
    if (items.length >= (options.limit ?? DEFAULT_LIMIT)) {
      break;
    }
  }
  return items;
};

/**
 * Recent items matching quick bar input: each description word must appear in the item's
 * description or project name (case ignored), and an `@project` token must match its project.
 * Pure.
 */
export const filterRecent = (
  recent: readonly RecentEntry[],
  input: QuickInput,
  projects: readonly Project[],
): RecentEntry[] => {
  const names = new Map(projects.map((project) => [project.id, fold(project.name)]));
  const words = fold(input.description)
    .split(' ')
    .filter((word) => word !== '');
  const allowed =
    input.projectQuery === undefined
      ? null
      : new Set(matchProjects(input.projectQuery, projects).map((match) => match.project.id));
  return recent.filter((item) => {
    if (allowed !== null && !allowed.has(item.project)) {
      return false;
    }
    const haystack = `${fold(item.description)} ${names.get(item.project) ?? item.project}`;
    return words.every((word) => haystack.includes(word));
  });
};
