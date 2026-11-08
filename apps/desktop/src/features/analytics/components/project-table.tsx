import { formatElapsed, formatMoney, type ProjectShare } from '@ttime/core';

import { ProjectDot } from '../../../shared/ui/project-dot';
import { useAnalyticsStore } from '../store/analytics-store';
import { ChartCard } from './chart-card';

/** Per project: hours, share of the total and amount. A project name opens its breakdown. */
export const ProjectTable = ({ projects }: { readonly projects: readonly ProjectShare[] }) => {
  const drill = useAnalyticsStore((state) => state.drill);
  return (
    <ChartCard title="Projects">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-(--color-text-muted)">
          <tr>
            <th className="pb-2 font-normal">Project</th>
            <th className="pb-2 text-right font-normal">Hours</th>
            <th className="pb-2 text-right font-normal">Share</th>
            <th className="pb-2 text-right font-normal">Amount</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.project} className="border-t border-(--color-border)">
              <td className="py-1.5">
                <button
                  type="button"
                  className="flex items-center gap-2 hover:underline"
                  onClick={() => {
                    drill(project.project);
                  }}
                >
                  <ProjectDot color={project.color} />
                  {project.name}
                </button>
              </td>
              <td className="text-right tabular-nums">{formatElapsed(project.seconds)}</td>
              <td className="text-right tabular-nums">{Math.round(project.share * 100)}%</td>
              <td className="text-right tabular-nums">
                {project.amounts.length === 0 ? '–' : project.amounts.map(formatMoney).join(' + ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ChartCard>
  );
};
