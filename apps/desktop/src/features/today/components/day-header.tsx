import { type DayView, formatElapsed, Temporal } from '@ttime/core';

import { FALLBACK_COLOR } from '../../../shared/lib/display';
import { useVaultStore } from '../../../shared/store/vault-store';
import { ProjectDot } from '../../../shared/ui/project-dot';
import { useDayStore } from '../store/day-store';

const NAV = 'rounded-md px-2 py-1 text-sm hover:bg-(--color-control)';

const dayLabel = (date: string): string =>
  Temporal.PlainDate.from(date).toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/** The day, its navigation, and its totals per project. */
export const DayHeader = ({ view }: { readonly view: DayView }) => {
  const step = useDayStore((state) => state.step);
  const goToday = useDayStore((state) => state.goToday);
  const projects = useVaultStore((state) => state.snapshot?.projects);
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h1 className="flex-1 text-lg font-semibold">{dayLabel(view.date)}</h1>
        <button
          type="button"
          aria-label="Previous day"
          className={NAV}
          onClick={() => {
            step(-1);
          }}
        >
          ←
        </button>
        <button type="button" className={NAV} onClick={goToday}>
          Today
        </button>
        <button
          type="button"
          aria-label="Next day"
          className={NAV}
          onClick={() => {
            step(1);
          }}
        >
          →
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>
          Total{' '}
          <span className="font-semibold tabular-nums">{formatElapsed(view.totalSeconds)}</span>
        </span>
        {view.byProject.map((total) => {
          const project = projects?.get(total.project);
          return (
            <span
              key={total.project}
              className="flex items-center gap-1.5 text-(--color-text-muted)"
            >
              <ProjectDot color={project?.color ?? FALLBACK_COLOR} />
              {project?.name ?? total.project}
              <span className="tabular-nums">{formatElapsed(total.seconds)}</span>
            </span>
          );
        })}
      </div>
    </header>
  );
};
