import type { Project, RunningEntry } from '@ttime/core';

import type { RunningSummary } from '../../../shared/bridge/window-api';

/** Gray used when a project is missing. */
export const FALLBACK_COLOR = '#8E8E93';

/** What the menu bar needs about the running entry, or null when nothing runs. */
export const toRunningSummary = (
  running: RunningEntry | null,
  projects: ReadonlyMap<string, Project>,
): RunningSummary | null => {
  if (running === null) {
    return null;
  }
  const project = projects.get(running.project);
  return {
    start: running.start,
    projectName: project?.name ?? running.project,
    color: project?.color ?? FALLBACK_COLOR,
  };
};
