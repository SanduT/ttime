import {
  currentTotals,
  DEFAULT_SETTINGS,
  type Entry,
  formatElapsed,
  type ProjectTotal,
} from '@ttime/core';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

import { createSystemClock } from '../../../shared/adapters/system';
import { useElapsed } from '../../../shared/hooks/use-elapsed';
import { FALLBACK_COLOR } from '../../../shared/lib/display';
import { useVaultStore } from '../../../shared/store/vault-store';
import { ProjectDot } from '../../../shared/ui/project-dot';
import { Card } from './card';

const clock = createSystemClock();

type TotalProps = {
  readonly label: string;
  readonly seconds: number;
  readonly byProject: readonly ProjectTotal[];
  readonly open: boolean;
  readonly onToggle: () => void;
};

/** A thin bar split by project color. */
const SplitBar = ({ seconds, byProject }: Pick<TotalProps, 'seconds' | 'byProject'>) => {
  const projects = useVaultStore((state) => state.snapshot?.projects);
  return (
    <div className="flex h-[5px] gap-0.5 overflow-hidden rounded-full bg-(--color-control)">
      {byProject.map((total) => (
        <motion.span
          key={total.project}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          className="origin-left"
          style={{
            width: `${String(seconds === 0 ? 0 : (total.seconds / seconds) * 100)}%`,
            background: projects?.get(total.project)?.color ?? FALLBACK_COLOR,
          }}
        />
      ))}
    </div>
  );
};

/** Today or This week: the total and a project bar; click to list the projects. */
const TotalCard = ({ label, seconds, byProject, open, onToggle }: TotalProps) => (
  <Card label={label}>
    <button
      type="button"
      aria-expanded={open}
      className="flex w-full flex-col gap-2 rounded-[14px] p-3 text-left transition-colors hover:bg-(--color-hover)"
      onClick={onToggle}
    >
      <span className="text-xs text-(--color-text-muted)">{label}</span>
      <span className="text-xl font-semibold tracking-[-0.02em] tabular-nums">
        {formatElapsed(seconds)}
      </span>
      <SplitBar seconds={seconds} byProject={byProject} />
    </button>
  </Card>
);

/** The per-project list for the expanded total. */
const ProjectList = ({ byProject }: { readonly byProject: readonly ProjectTotal[] }) => {
  const projects = useVaultStore((state) => state.snapshot?.projects);
  return (
    <motion.ul
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden px-3"
    >
      {byProject.length === 0 ? (
        <li className="py-1 text-xs text-(--color-text-muted)">Nothing tracked.</li>
      ) : null}
      {byProject.map((total) => {
        const project = projects?.get(total.project);
        return (
          <li key={total.project} className="flex items-center gap-2 py-1 text-xs">
            <ProjectDot color={project?.color ?? FALLBACK_COLOR} />
            <span className="flex-1">{project?.name ?? total.project}</span>
            <span className="text-(--color-text-muted) tabular-nums">
              {formatElapsed(total.seconds)}
            </span>
          </li>
        );
      })}
    </motion.ul>
  );
};

/** Today and This week totals, expandable per project. */
export const TotalsSection = () => {
  const snapshot = useVaultStore((state) => state.snapshot);
  const [open, setOpen] = useState<'today' | 'week' | null>(null);
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
  const toggle = (which: 'today' | 'week') => () => {
    setOpen(open === which ? null : which);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <TotalCard
          label="Today"
          {...totals.today}
          open={open === 'today'}
          onToggle={toggle('today')}
        />
        <TotalCard
          label="This week"
          {...totals.week}
          open={open === 'week'}
          onToggle={toggle('week')}
        />
      </div>
      <AnimatePresence initial={false}>
        {open === null ? null : (
          <ProjectList
            key={open}
            byProject={open === 'today' ? totals.today.byProject : totals.week.byProject}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
