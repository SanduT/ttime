import {
  filterRecent,
  matchProjects,
  planQuickInput,
  type Project,
  type QuickContext,
  type QuickPlan,
  type RecentEntry,
} from '@ttime/core';

import { projectQueryAtEnd } from './tokens';

/** One row of the quick bar list. `id` is the cmdk value. */
export type QuickItem =
  | { readonly kind: 'start'; readonly id: string; readonly plan: QuickPlan }
  | { readonly kind: 'trim'; readonly id: string; readonly plan: QuickPlan }
  | { readonly kind: 'project'; readonly id: string; readonly project: Project }
  | { readonly kind: 'create-project'; readonly id: string; readonly name: string }
  | { readonly kind: 'recent'; readonly id: string; readonly item: RecentEntry };

const MAX_PROJECTS = 6;
const MAX_RECENT = 8;

const projectItems = (query: string, projects: readonly Project[]): QuickItem[] => {
  const active = projects.filter((project) => project.status === 'active');
  const found =
    query === ''
      ? [...active].sort((a, b) => a.name.localeCompare(b.name))
      : matchProjects(query, active).map((match) => match.project);
  const items: QuickItem[] = found
    .slice(0, MAX_PROJECTS)
    .map((project) => ({ kind: 'project', id: `project:${project.id}`, project }));
  const exact = matchProjects(query, active).some(
    (match) => match.kind === 'slug' || match.kind === 'name',
  );
  return query === '' || exact
    ? items
    : [...items, { kind: 'create-project', id: 'create-project', name: query }];
};

/**
 * The quick bar list for `text`: only the latest recent entry for empty text (one-key
 * continue, with the Today list below), project
 * completions while an `@query` is being typed, otherwise a start row followed by matching
 * recent entries.
 */
export const buildItems = (text: string, context: QuickContext): QuickItem[] => {
  const query = projectQueryAtEnd(text);
  if (query !== null) {
    return projectItems(query, context.projects);
  }
  const plan = planQuickInput(text, context);
  const recent = filterRecent(context.recent, plan.input, context.projects)
    .slice(0, MAX_RECENT)
    .map((item, index): QuickItem => ({ kind: 'recent', id: `recent:${String(index)}`, item }));
  return plan.text === '' ? recent.slice(0, 1) : [{ kind: 'start', id: 'start', plan }, ...recent];
};
