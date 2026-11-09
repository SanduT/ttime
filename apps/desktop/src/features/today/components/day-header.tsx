import { type DayView, formatElapsed, Temporal } from '@ttime/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

import { createSystemClock } from '../../../shared/adapters/system';
import { FALLBACK_COLOR } from '../../../shared/lib/display';
import { useVaultStore } from '../../../shared/store/vault-store';
import { Button } from '../../../shared/ui/button';
import { useDayStore } from '../store/day-store';

const weekdayOf = (date: string): string =>
  Temporal.PlainDate.from(date).toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const clock = createSystemClock();

/** Today, Yesterday or Tomorrow, else the weekday. */
const titleOf = (date: string): string => {
  const days = Temporal.PlainDate.from(date).since(clock.now().toPlainDate()).days;
  const relative: Readonly<Record<number, string>> = {
    0: 'Today',
    [-1]: 'Yesterday',
    1: 'Tomorrow',
  };
  return (
    relative[days] ?? Temporal.PlainDate.from(date).toLocaleString('en-GB', { weekday: 'long' })
  );
};

/** Untracked working-hours time of the day. */
const untrackedOf = (view: DayView): number =>
  view.rows.reduce((sum, row) => sum + (row.kind === 'gap' ? row.gap.seconds : 0), 0);

const Stat = ({
  label,
  value,
  index,
}: {
  readonly label: string;
  readonly value: string;
  readonly index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05, duration: 0.3 }}
    className="flex flex-col gap-1.5 rounded-[14px] border border-(--color-border) bg-(--color-raised) p-4 shadow-(--shadow-card)"
  >
    <span className="text-xs text-(--color-text-muted)">{label}</span>
    <span className="text-2xl font-semibold tracking-[-0.02em] tabular-nums">{value}</span>
  </motion.div>
);

/** The day's split by project: a bar that grows in, and a legend. */
const ProjectSplit = ({ view }: { readonly view: DayView }) => {
  const projects = useVaultStore((state) => state.snapshot?.projects);
  if (view.byProject.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex h-2 gap-[3px] overflow-hidden rounded-full">
        {view.byProject.map((total) => (
          <motion.span
            key={total.project}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 28 }}
            className="origin-left"
            style={{
              width: `${String((total.seconds / Math.max(1, view.totalSeconds)) * 100)}%`,
              background: projects?.get(total.project)?.color ?? FALLBACK_COLOR,
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-(--color-text-muted)">
        {view.byProject.map((total) => {
          const project = projects?.get(total.project);
          return (
            <span key={total.project} className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ background: project?.color ?? FALLBACK_COLOR }}
              />
              {project?.name ?? total.project}
              <span className="text-(--color-text) tabular-nums">
                {formatElapsed(total.seconds)}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** The day, its navigation, stat cards and the split by project. */
export const DayHeader = ({
  view,
  onAdd,
}: {
  readonly view: DayView;
  readonly onAdd: () => void;
}) => {
  const step = useDayStore((state) => state.step);
  const goToday = useDayStore((state) => state.goToday);
  const entries = view.rows.filter((row) => row.kind !== 'gap').length;
  return (
    <header className="flex flex-col gap-5">
      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-[13px] text-(--color-text-muted)">{weekdayOf(view.date)}</span>
          <h1 className="text-[28px] font-bold tracking-[-0.025em]">{titleOf(view.date)}</h1>
        </div>
        <Button
          aria-label="Previous day"
          className="w-8 px-0"
          onClick={() => {
            step(-1);
          }}
        >
          <ChevronLeft size={16} />
        </Button>
        <Button onClick={goToday}>Today</Button>
        <Button
          aria-label="Next day"
          className="w-8 px-0"
          onClick={() => {
            step(1);
          }}
        >
          <ChevronRight size={16} />
        </Button>
        <Button variant="primary" onClick={onAdd}>
          Add entry
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat index={0} label="Tracked" value={formatElapsed(view.totalSeconds)} />
        <Stat
          index={1}
          label="Untracked in working hours"
          value={formatElapsed(untrackedOf(view))}
        />
        <Stat index={2} label="Entries" value={String(entries)} />
      </div>
      <ProjectSplit view={view} />
    </header>
  );
};
