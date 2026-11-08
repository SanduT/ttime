import { useMemo } from 'react';

import { useVaultStore } from '../../../shared/store/vault-store';
import { summarize } from '../lib/summarize';

const Stat = ({ label, value }: { readonly label: string; readonly value: number }) => (
  <div className="rounded-lg bg-(--color-control) px-3 py-2">
    <dt className="text-xs text-(--color-text-muted)">{label}</dt>
    <dd className="text-lg font-semibold tabular-nums">{value}</dd>
  </div>
);

/** The open vault: where it is, what it holds and any file problems. */
export const VaultOverview = () => {
  const snapshot = useVaultStore((state) => state.snapshot);
  const root = useVaultStore((state) => state.vault?.root ?? '');
  const summary = useMemo(() => (snapshot === null ? null : summarize(snapshot)), [snapshot]);
  if (summary === null) {
    return null;
  }
  return (
    <main className="flex min-h-screen flex-col gap-4 p-6">
      <header>
        <h1 className="text-base font-semibold">{summary.name}</h1>
        <p className="text-xs break-all text-(--color-text-muted)">{root}</p>
      </header>
      <dl className="grid grid-cols-4 gap-2">
        <Stat label="Projects" value={summary.projects} />
        <Stat label="Clients" value={summary.clients} />
        <Stat label="Days" value={summary.days} />
        <Stat label="Entries" value={summary.entries} />
      </dl>
      <p className="text-sm">{summary.running ? 'A timer is running.' : 'Not tracking.'}</p>
      {summary.readOnly && (
        <p className="text-sm text-(--color-danger)">
          This vault was written by a newer ttime, so it is read-only here.
        </p>
      )}
      <section aria-labelledby="issues-heading" className="flex flex-col gap-2">
        <h2 id="issues-heading" className="text-sm font-semibold">
          Issues ({summary.issues.length})
        </h2>
        {summary.issues.length === 0 ? (
          <p className="text-xs text-(--color-text-muted)">Every file is valid.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-xs">
            {summary.issues.map((issue) => (
              <li key={`${issue.file}:${issue.path.join('.')}:${issue.code}`}>
                <span className="font-medium">{issue.file}</span>: {issue.message}
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-(--color-text-muted)">
        Today, Calendar, Projects and Analytics will live here. Changes made on disk show up
        automatically.
      </p>
    </main>
  );
};
