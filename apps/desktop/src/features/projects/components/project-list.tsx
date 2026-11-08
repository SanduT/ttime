import { formatElapsed, type Project } from '@ttime/core';
import { useMemo } from 'react';

import { useVaultStore } from '../../../shared/store/vault-store';
import { ProjectDot } from '../../../shared/ui/project-dot';
import { useProjectHours } from '../hooks/use-project-hours';
import { groupProjects } from '../lib/group-projects';
import { useProjectsStore } from '../store/projects-store';

const COLUMNS = 'grid grid-cols-[1fr_5rem_5rem_5rem_5rem] items-center gap-2';

const ProjectRow = ({
  project,
  hours,
}: {
  readonly project: Project;
  readonly hours:
    { readonly week: number; readonly month: number; readonly all: number } | undefined;
}) => {
  const select = useProjectsStore((state) => state.select);
  return (
    <li>
      <button
        type="button"
        className={`${COLUMNS} w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-(--color-control)`}
        onClick={() => {
          select(project.id);
        }}
      >
        <span className="flex min-w-0 items-center gap-2">
          <ProjectDot color={project.color} />
          <span className="truncate">{project.name}</span>
        </span>
        <span className="text-right tabular-nums">{formatElapsed(hours?.week ?? 0)}</span>
        <span className="text-right tabular-nums">{formatElapsed(hours?.month ?? 0)}</span>
        <span className="text-right tabular-nums">{formatElapsed(hours?.all ?? 0)}</span>
        <span className="text-right text-xs text-(--color-text-muted)">
          {project.status === 'archived' ? 'Archived' : ''}
        </span>
      </button>
    </li>
  );
};

/** Projects grouped by client with their hours this week, this month and all time. */
export const ProjectList = () => {
  const snapshot = useVaultStore((state) => state.snapshot);
  const showArchived = useProjectsStore((state) => state.showArchived);
  const edit = useProjectsStore((state) => state.edit);
  const hours = useProjectHours();
  const groups = useMemo(
    () =>
      snapshot === null
        ? []
        : groupProjects(snapshot.projects.values(), snapshot.clients, showArchived),
    [snapshot, showArchived],
  );
  if (groups.length === 0) {
    return (
      <p className="text-sm text-(--color-text-muted)">
        No projects yet. Create one with New project.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className={`${COLUMNS} px-2 text-xs text-(--color-text-muted)`}>
        <span>Project</span>
        <span className="text-right">This week</span>
        <span className="text-right">This month</span>
        <span className="text-right">All time</span>
        <span />
      </div>
      {groups.map((group) => (
        <section key={group.client?.id ?? 'no-client'} className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 px-2 text-xs font-semibold text-(--color-text-muted) uppercase">
            {group.client?.name ?? 'No client'}
            {group.client?.archived === true ? (
              <span className="font-normal normal-case">(archived)</span>
            ) : null}
            {group.client === null ? null : (
              <button
                type="button"
                className="font-normal text-(--color-accent) normal-case hover:underline"
                onClick={() => {
                  edit({ kind: 'client', id: group.client?.id ?? null });
                }}
              >
                Edit
              </button>
            )}
          </h2>
          <ul className="flex flex-col">
            {group.projects.map((project) => (
              <ProjectRow key={project.id} project={project} hours={hours.get(project.id)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
