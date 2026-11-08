import { type Entry, formatElapsed, type Project, secondsBetween } from '@ttime/core';

import { useElapsed } from '../../../shared/hooks/use-elapsed';
import { clockOf, FALLBACK_COLOR } from '../../../shared/lib/display';
import { useVaultStore } from '../../../shared/store/vault-store';
import { ProjectDot } from '../../../shared/ui/project-dot';
import type { QuickResult } from '../store/quickbar-store';

type Props = { readonly result: QuickResult };

const name = (projects: ReadonlyMap<string, Project> | undefined, id: string) =>
  projects?.get(id)?.name ?? id;

const duration = (entry: Entry): string =>
  formatElapsed(secondsBetween(entry.start, entry.end), { seconds: true });

const describe = (description: string): string =>
  description === '' ? '(no description)' : `“${description}”`;

const Stopped = ({ entry, label }: { readonly entry: Entry | null; readonly label: string }) => {
  const projects = useVaultStore((state) => state.snapshot?.projects);
  if (entry === null) {
    return <p className="text-(--color-text-muted)">Nothing logged: the entry had no length.</p>;
  }
  return (
    <p className="text-(--color-text-muted)">
      {label} {describe(entry.description)} on {name(projects, entry.project)} after{' '}
      <span className="tabular-nums">{duration(entry)}</span> ({clockOf(entry.start)} to{' '}
      {clockOf(entry.end)})
    </p>
  );
};

type Started = Exclude<QuickResult, { readonly kind: 'stopped' }>;

const StartedCard = ({ result }: { readonly result: Started }) => {
  const projects = useVaultStore((state) => state.snapshot?.projects);
  const elapsed = useElapsed(result.entry.start);
  const project = projects?.get(result.entry.project);
  return (
    <section className="flex flex-col gap-3 p-4 text-sm">
      <h2 className="text-base font-semibold">
        {result.kind === 'edited' ? 'Updated' : 'Started'}
      </h2>
      <div className="flex items-center gap-2">
        <ProjectDot color={project?.color ?? FALLBACK_COLOR} />
        <span className="font-medium">{project?.name ?? result.entry.project}</span>
        <span className="min-w-0 flex-1 truncate">{describe(result.entry.description)}</span>
        <span className="text-(--color-text-muted)">from {clockOf(result.entry.start)}</span>
        <span className="text-2xl font-semibold tabular-nums">
          {formatElapsed(elapsed, { seconds: true })}
        </span>
      </div>
      {result.kind === 'started' && result.stopped !== null ? (
        <Stopped entry={result.stopped} label="Stopped" />
      ) : null}
    </section>
  );
};

/** Confirms the last action: the new entry with a live timer, or what was logged. */
export const ResultCard = ({ result }: Props) =>
  result.kind === 'stopped' ? (
    <section className="flex flex-col gap-2 p-4 text-sm">
      <h2 className="text-base font-semibold">Stopped</h2>
      <Stopped entry={result.entry} label="Logged" />
    </section>
  ) : (
    <StartedCard result={result} />
  );
