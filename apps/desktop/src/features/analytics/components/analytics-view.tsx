import { useState } from 'react';

import { Button } from '../../../shared/ui/button';
import { ExportDialog } from '../../export';
import { useAnalytics } from '../hooks/use-analytics';
import { usePeriodKeys } from '../hooks/use-period-keys';
import { useAnalyticsStore } from '../store/analytics-store';
import { DayChart } from './day-chart';
import { PeriodControls } from './period-controls';
import { ProjectBars } from './project-bars';
import { ProjectDrill } from './project-drill';
import { ProjectTable } from './project-table';
import { Totals } from './totals';

/** Analytics (PRD 6.3): totals, hours per project and per day, the project table, export. */
export const AnalyticsView = () => {
  usePeriodKeys();
  const { range, result, rounding } = useAnalytics();
  const project = useAnalyticsStore((state) => state.project);
  const [exporting, setExporting] = useState(false);
  return (
    <section className="flex max-w-5xl flex-col gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-[28px] font-bold tracking-[-0.025em]">Analytics</h1>
        <PeriodControls range={range} />
        <span className="flex-1" />
        <Button
          onClick={() => {
            setExporting(true);
          }}
        >
          Export CSV
        </Button>
      </header>
      {rounding.mode === 'none' ? null : (
        <p className="text-xs text-(--color-text-muted)">
          Rounded {rounding.mode} to {rounding.minutes} minutes per{' '}
          {rounding.scope === 'day' ? 'project day' : 'entry'}, as in Settings.
        </p>
      )}
      <Totals totals={result.totals} />
      {project === null ? (
        <>
          {result.projects.length === 0 ? (
            <p className="text-sm text-(--color-text-muted)">No time in this period.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <ProjectBars projects={result.projects} />
              <DayChart days={result.days} projects={result.projects} />
            </div>
          )}
          {result.projects.length === 0 ? null : <ProjectTable projects={result.projects} />}
        </>
      ) : (
        <ProjectDrill result={result} project={project} />
      )}
      {exporting ? (
        <ExportDialog
          project={project}
          initial={{ kind: 'custom', from: range.from, to: range.to }}
          onClose={() => {
            setExporting(false);
          }}
        />
      ) : null}
    </section>
  );
};
