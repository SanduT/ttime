import { epochSeconds, type Project, type RunningEntry } from '@ttime/core';

import type { RunningSummary } from '../../../shared/bridge/window-api';
import { FALLBACK_COLOR } from '../../../shared/lib/display';

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
    startEpochSeconds: epochSeconds(running.start),
    projectName: project?.name ?? running.project,
    color: project?.color ?? FALLBACK_COLOR,
  };
};
