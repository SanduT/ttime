import type { Client, Project } from '@ttime/core';

/** Projects of one client, or of no client (`client` null). */
export type ProjectGroup = {
  readonly client: Client | null;
  readonly projects: readonly Project[];
};

/**
 * Projects grouped by client, clients by name with "no client" last, projects by name. Archived
 * projects and clients are left out unless `showArchived`. Pure.
 */
export const groupProjects = (
  projects: Iterable<Project>,
  clients: ReadonlyMap<string, Client>,
  showArchived: boolean,
): ProjectGroup[] => {
  const visible = [...projects]
    .filter((project) => showArchived || project.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name));
  const byClient = new Map<string | null, Project[]>();
  for (const project of visible) {
    const key = project.client !== undefined && clients.has(project.client) ? project.client : null;
    byClient.set(key, [...(byClient.get(key) ?? []), project]);
  }
  const named = [...clients.values()]
    .filter((client) => showArchived || !client.archived || byClient.has(client.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((client) => ({ client, projects: byClient.get(client.id) ?? [] }));
  const loose = byClient.get(null);
  return [...named, ...(loose === undefined ? [] : [{ client: null, projects: loose }])];
};
