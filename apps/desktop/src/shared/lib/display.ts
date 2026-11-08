import type { Entry, Project, Timestamp } from '@ttime/core';

/** Gray used when a project is missing. */
export const FALLBACK_COLOR = '#8E8E93';

/** `HH:MM` of a vault timestamp, in its own offset. */
export const clockOf = (timestamp: Timestamp): string => timestamp.slice(11, 16);

/** Longest label the Resume button and menu item show before an ellipsis. */
const RESUME_LABEL_MAX = 40;

/** What Resume continues: the entry's description, or its project name when it has none. */
export const resumeLabel = (entry: Entry, projects: ReadonlyMap<string, Project>): string => {
  const text =
    entry.description === ''
      ? (projects.get(entry.project)?.name ?? entry.project)
      : entry.description;
  return text.length > RESUME_LABEL_MAX ? `${text.slice(0, RESUME_LABEL_MAX - 1)}…` : text;
};
