import type { VaultIssue, VaultSnapshot } from '@ttime/core';

/** What the overview shows about a loaded vault. */
export type VaultSummary = {
  readonly name: string;
  readonly projects: number;
  readonly clients: number;
  readonly days: number;
  readonly entries: number;
  readonly running: boolean;
  readonly readOnly: boolean;
  readonly issues: readonly VaultIssue[];
};

/** Counts and issues of a snapshot. */
export const summarize = (snapshot: VaultSnapshot): VaultSummary => ({
  name: snapshot.config?.name ?? 'Unnamed vault',
  projects: snapshot.projects.size,
  clients: snapshot.clients.size,
  days: snapshot.days.size,
  entries: [...snapshot.days.values()].reduce((sum, day) => sum + day.entries.length, 0),
  running: snapshot.running !== null,
  readOnly: snapshot.readOnly,
  issues: snapshot.issues,
});
