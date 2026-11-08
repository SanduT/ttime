import { type Analytics, formatElapsed, type ReportRow } from '@ttime/core';

import { clockOf } from '../../../shared/lib/display';
import { Button } from '../../../shared/ui/button';
import { ProjectDot } from '../../../shared/ui/project-dot';
import { useAnalyticsStore } from '../store/analytics-store';
import { ChartCard } from './chart-card';
import { ProjectBars } from './project-bars';

const byDate = (rows: readonly ReportRow[]): [string, ReportRow[]][] => {
  const groups = new Map<string, ReportRow[]>();
  for (const row of rows) {
    groups.set(row.date, [...(groups.get(row.date) ?? []), row]);
  }
  return [...groups].sort(([a], [b]) => b.localeCompare(a));
};

/** One project in the period: its total, and each day's entries with their notes. */
export const ProjectDrill = ({
  result,
  project,
}: {
  readonly result: Analytics;
  readonly project: string;
}) => {
  const drill = useAnalyticsStore((state) => state.drill);
  const share = result.projects.find((item) => item.project === project);
  const days = byDate(result.rows.filter((row) => row.project === project));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          onClick={() => {
            drill(null);
          }}
        >
          ← All projects
        </Button>
        {share === undefined ? null : <ProjectDot color={share.color} />}
        <h2 className="text-base font-semibold">{share?.name ?? project}</h2>
      </div>
      {share === undefined ? null : <ProjectBars projects={[share]} />}
      <ChartCard title="Days">
        {days.length === 0 ? (
          <p className="text-sm text-(--color-text-muted)">No time in this period.</p>
        ) : null}
        {days.map(([date, rows]) => (
          <section key={date} className="flex flex-col gap-1">
            <h3 className="flex justify-between text-xs font-semibold text-(--color-text-muted)">
              <span>{date}</span>
              <span className="tabular-nums">
                {formatElapsed(rows.reduce((sum, row) => sum + row.seconds, 0))}
              </span>
            </h3>
            {rows.map((row) => (
              <div key={`${row.start}-${row.end}`} className="text-sm">
                <div className="flex gap-3">
                  <span className="w-24 shrink-0 text-(--color-text-muted) tabular-nums">
                    {clockOf(row.start)} – {clockOf(row.end)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {row.description === '' ? '(no description)' : row.description}
                  </span>
                  <span className="tabular-nums">{formatElapsed(row.seconds)}</span>
                </div>
                {row.notes.map((note) => (
                  <p
                    key={`${note.at}-${note.text}`}
                    className="pl-27 text-xs text-(--color-text-muted)"
                  >
                    {clockOf(note.at)} {note.text}
                  </p>
                ))}
              </div>
            ))}
          </section>
        ))}
      </ChartCard>
    </div>
  );
};
