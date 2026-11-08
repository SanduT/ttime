import { formatElapsed, formatTimestamp, type Project } from '@ttime/core';
import { useMemo } from 'react';

import { createSystemClock } from '../../../shared/adapters/system';
import { useVaultStore } from '../../../shared/store/vault-store';
import { useElapsed } from '../hooks/use-elapsed';
import { clockOf } from '../lib/clock-input';
import { FALLBACK_COLOR } from '../lib/running-summary';
import { buildToday } from '../lib/today';
import { ProjectDot } from './project-dot';

const clock = createSystemClock();

/** Today's entries with their times, so missed time is easy to spot and fill in. */
export const TodayList = () => {
  const snapshot = useVaultStore((state) => state.snapshot);
  const running = snapshot?.running ?? null;
  // Re-render every second while tracking so the running row and total stay current.
  useElapsed(running?.start ?? null);
  const now = clock.now();
  const today = buildToday(
    snapshot?.days ?? new Map(),
    running,
    now.toPlainDate().toString(),
    formatTimestamp(now),
  );
  const projects = useMemo(() => snapshot?.projects ?? new Map<string, Project>(), [snapshot]);

  return (
    <section aria-label="Today" className="mt-2 border-t border-(--color-border) px-3 pt-2 text-sm">
      <h2 className="mb-1 flex text-xs font-medium text-(--color-text-muted)">
        <span className="flex-1">Today</span>
        <span className="tabular-nums">{formatElapsed(today.totalSeconds)}</span>
      </h2>
      {today.rows.length === 0 ? (
        <p className="py-1 text-(--color-text-muted)">Nothing tracked today yet.</p>
      ) : (
        <ol className="flex flex-col">
          {today.rows.map((row) => {
            const project = projects.get(row.project);
            return (
              <li key={row.id} className="flex items-center gap-2 py-1">
                <span className="w-24 shrink-0 text-(--color-text-muted) tabular-nums">
                  {clockOf(row.start)} – {row.end === null ? 'now' : clockOf(row.end)}
                </span>
                <ProjectDot color={project?.color ?? FALLBACK_COLOR} />
                <span className="min-w-0 flex-1 truncate">
                  {row.description === '' ? '(no description)' : row.description}
                  <span className="text-(--color-text-muted)">
                    {' '}
                    · {project?.name ?? row.project}
                  </span>
                </span>
                <span className="text-(--color-text-muted) tabular-nums">
                  {formatElapsed(row.seconds)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};
