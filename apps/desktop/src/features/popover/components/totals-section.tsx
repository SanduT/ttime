import {
  currentTotals,
  DEFAULT_SETTINGS,
  type Entry,
  formatElapsed,
  type ProjectTotal,
} from '@ttime/core';
import { useState } from 'react';

import { createSystemClock } from '../../../shared/adapters/system';
import { useElapsed } from '../../../shared/hooks/use-elapsed';
import { FALLBACK_COLOR } from '../../../shared/lib/display';
import { useVaultStore } from '../../../shared/store/vault-store';
import { ProjectDot } from '../../../shared/ui/project-dot';

const clock = createSystemClock();

type RowProps = {
  readonly label: string;
  readonly seconds: number;
  readonly byProject: readonly ProjectTotal[];
};

const TotalRow = ({ label, seconds, byProject }: RowProps) => {
  const [open, setOpen] = useState(false);
  const projects = useVaultStore((state) => state.snapshot?.projects);
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-(--color-control)"
        onClick={() => {
          setOpen(!open);
        }}
      >
        <span className="w-3 text-(--color-text-muted)">{open ? '▾' : '▸'}</span>
        <span className="flex-1 text-left">{label}</span>
        <span className="font-medium tabular-nums">{formatElapsed(seconds)}</span>
      </button>
      {open ? (
        <ul className="pb-1 pl-7">
          {byProject.length === 0 ? (
            <li className="py-0.5 text-xs text-(--color-text-muted)">Nothing tracked.</li>
          ) : null}
          {byProject.map((total) => {
            const project = projects?.get(total.project);
            return (
              <li key={total.project} className="flex items-center gap-2 py-0.5 pr-2 text-xs">
                <ProjectDot color={project?.color ?? FALLBACK_COLOR} />
                <span className="flex-1">{project?.name ?? total.project}</span>
                <span className="text-(--color-text-muted) tabular-nums">
                  {formatElapsed(total.seconds)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
};

/** Today and This week totals, expandable per project. */
export const TotalsSection = () => {
  const snapshot = useVaultStore((state) => state.snapshot);
  const running = snapshot?.running ?? null;
  // Re-render every second while tracking so the totals include the running time.
  useElapsed(running?.start ?? null);
  const entries: Entry[] = [...(snapshot?.days.values() ?? [])].flatMap((day) => day.entries);
  const totals = currentTotals({
    entries,
    running,
    now: clock.now(),
    settings: snapshot?.config?.settings ?? DEFAULT_SETTINGS,
  });
  return (
    <section aria-label="Totals" className="border-t border-(--color-border) px-2 py-2">
      <ul>
        <TotalRow label="Today" seconds={totals.today.seconds} byProject={totals.today.byProject} />
        <TotalRow
          label="This week"
          seconds={totals.week.seconds}
          byProject={totals.week.byProject}
        />
      </ul>
    </section>
  );
};
