import type { Project } from '../schema/project';

/** How a project matched a query, best first. */
export type MatchKind = 'slug' | 'name' | 'prefix' | 'subsequence';

/** One ranked project candidate. */
export type ProjectMatch = {
  readonly project: Project;
  readonly kind: MatchKind;
  /** Lower is better. Only meaningful between matches of the same kind. */
  readonly score: number;
};

const KIND_ORDER: readonly MatchKind[] = ['slug', 'name', 'prefix', 'subsequence'];

const normalize = (text: string): string =>
  text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();

/** Gaps between matched characters, or null when `query` is not a subsequence of `text`. */
const subsequenceGaps = (query: string, text: string): number | null => {
  let gaps = 0;
  let from = 0;
  for (const char of query) {
    const found = text.indexOf(char, from);
    if (found < 0) {
      return null;
    }
    gaps += found - from;
    from = found + 1;
  }
  return gaps;
};

const matchOne = (query: string, project: Project): ProjectMatch | null => {
  const name = normalize(project.name);
  if (project.id === query) {
    return { project, kind: 'slug', score: 0 };
  }
  if (name === query) {
    return { project, kind: 'name', score: 0 };
  }
  const words = [project.id, ...name.split(/[\s-]+/)];
  if (name.startsWith(query) || words.some((word) => word.startsWith(query))) {
    return { project, kind: 'prefix', score: name.length - query.length };
  }
  const gaps = Math.min(
    subsequenceGaps(query, project.id) ?? Infinity,
    subsequenceGaps(query, name) ?? Infinity,
  );
  return gaps === Infinity ? null : { project, kind: 'subsequence', score: gaps };
};

/**
 * Ranks projects for a quick bar `@query`: exact slug, then exact name (case and accents
 * ignored), then prefix of the name or a word in it, then subsequence (fewest gaps first).
 * Active projects come before archived ones within a kind. Pure.
 */
export const matchProjects = (query: string, projects: readonly Project[]): ProjectMatch[] => {
  const needle = normalize(query.trim());
  if (needle === '') {
    return [];
  }
  return projects
    .map((project) => matchOne(needle, project))
    .filter((match): match is ProjectMatch => match !== null)
    .sort(
      (a, b) =>
        KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
        Number(a.project.status === 'archived') - Number(b.project.status === 'archived') ||
        a.score - b.score ||
        a.project.id.localeCompare(b.project.id),
    );
};
