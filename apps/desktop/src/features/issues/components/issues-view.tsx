import type { VaultIssue } from '@ttime/core';

import { useVaultStore } from '../../../shared/store/vault-store';

const SEVERITY_CLASS: Readonly<Record<VaultIssue['severity'], string>> = {
  error: 'text-(--color-danger)',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-(--color-text-muted)',
};

const location = (issue: VaultIssue): string =>
  issue.line === undefined ? issue.file : `${issue.file}:${String(issue.line)}`;

/**
 * Vault problems by file, with line numbers (ARCHITECTURE 4.4). Broken files are never
 * rewritten; fixing them on disk clears the issue within a second.
 */
export const IssuesView = () => {
  const issues = useVaultStore((state) => state.snapshot?.issues ?? []);
  const root = useVaultStore((state) => state.vault?.root ?? '');
  return (
    <section className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold">Issues</h1>
        <p className="text-xs text-(--color-text-muted)">
          Files in <span className="break-all">{root}</span> that ttime could not use as they are.
          ttime never rewrites a broken file. Fix it in any editor and this list updates.
        </p>
      </header>
      {issues.length === 0 ? (
        <p className="text-sm text-(--color-text-muted)">Every file is valid.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {issues.map((issue) => (
            <li
              key={`${issue.file}:${issue.path.join('.')}:${issue.code}`}
              className="rounded-md border border-(--color-border) px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold uppercase ${SEVERITY_CLASS[issue.severity]}`}
                >
                  {issue.severity}
                </span>
                <code className="text-xs">{location(issue)}</code>
              </div>
              <p>{issue.message}</p>
              {issue.path.length === 0 ? null : (
                <p className="text-xs text-(--color-text-muted)">at {issue.path.join('.')}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
