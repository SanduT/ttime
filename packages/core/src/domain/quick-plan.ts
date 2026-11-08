import type { RunningEntry } from '../schema/entry';
import type { Project } from '../schema/project';
import { matchProjects } from './project-matcher';
import { parseQuickInput, type QuickInput } from './quick-input-parser';
import type { RecentEntry } from './recent-entries';

/** The project quick bar text resolves to: an existing one, or one to create. */
export type QuickProject =
  | { readonly kind: 'existing'; readonly project: Project }
  | { readonly kind: 'new'; readonly name: string };

/** Parsed quick bar text with its project resolved, ready for {@link QuickActions}. */
export type QuickPlan = {
  /** The text as typed, trimmed. */
  readonly text: string;
  readonly input: QuickInput;
  /** Null when there is no `@project` and nothing to fall back on. */
  readonly project: QuickProject | null;
  /** The running entry the plan was made against. */
  readonly running: RunningEntry | null;
};

/** What the quick bar knows when the user types. */
export type QuickContext = {
  readonly projects: readonly Project[];
  readonly running: RunningEntry | null;
  /** Newest first, as from `recentEntries`. */
  readonly recent: readonly RecentEntry[];
};

const isActive = (project: Project | undefined): project is Project => project?.status === 'active';

const fromQuery = (query: string, projects: readonly Project[]): QuickProject => {
  const matches = matchProjects(query, projects);
  const best = matches.find((match) => isActive(match.project)) ?? matches[0];
  return best === undefined
    ? { kind: 'new', name: query }
    : { kind: 'existing', project: best.project };
};

const fallback = (context: QuickContext): QuickProject | null => {
  const byId = new Map(context.projects.map((project) => [project.id, project]));
  const candidates = [context.running?.project, ...context.recent.map((item) => item.project)];
  for (const id of candidates) {
    const project = id === undefined ? undefined : byId.get(id);
    if (isActive(project)) {
      return { kind: 'existing', project };
    }
  }
  return null;
};

/**
 * Parses quick bar text and resolves its project: the best `@project` match (active before
 * archived), a new project when nothing matches, otherwise the running entry's project, then
 * the latest active project from history. Pure.
 */
export const planQuickInput = (text: string, context: QuickContext): QuickPlan => {
  const input = parseQuickInput(text);
  const project =
    input.projectQuery === undefined
      ? fallback(context)
      : fromQuery(input.projectQuery, context.projects);
  return { text: text.trim(), input, project, running: context.running };
};
