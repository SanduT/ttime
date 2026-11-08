import { formatElapsed, type ProjectShare } from '@ttime/core';

import { ChartCard } from './chart-card';

/** Hours per project as horizontal bars, longest first, scaled to the largest project. */
export const ProjectBars = ({ projects }: { readonly projects: readonly ProjectShare[] }) => {
  const max = Math.max(...projects.map((project) => project.seconds), 1);
  return (
    <ChartCard title="Hours per project">
      <ul className="flex flex-col gap-2">
        {projects.map((project) => (
          <li
            key={project.project}
            className="grid grid-cols-[9rem_minmax(0,1fr)_3.5rem] items-center gap-3 text-sm"
          >
            <span className="truncate">{project.name}</span>
            <span className="h-3 rounded-sm bg-(--color-control)">
              <span
                className="block h-full rounded-sm"
                style={{
                  width: `${String((project.seconds / max) * 100)}%`,
                  background: project.color,
                }}
              />
            </span>
            <span className="text-right tabular-nums">{formatElapsed(project.seconds)}</span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
};
