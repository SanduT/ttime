import { amountFor, formatElapsed, formatMoney, type LocalDate } from '@ttime/core';
import { useState } from 'react';

import { clockOf } from '../../../shared/lib/display';
import { useVaultStore } from '../../../shared/store/vault-store';
import { Button } from '../../../shared/ui/button';
import { ProjectDot } from '../../../shared/ui/project-dot';
import { ExportDialog, type InitialPeriod } from '../../export';
import { useProjectDays } from '../hooks/use-project-days';
import type { Period, ProjectDay } from '../lib/project-entries';
import { useProjectsStore } from '../store/projects-store';

const PERIODS: readonly { readonly id: Period; readonly label: string }[] = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
];

/** A project's days with their entries and notes. */
const DayList = ({ days }: { readonly days: readonly ProjectDay[] }) =>
  days.map((day) => (
    <section key={day.date} className="flex flex-col gap-1">
      <h2 className="flex justify-between px-2 text-xs font-semibold text-(--color-text-muted)">
        <span>{day.date}</span>
        <span className="tabular-nums">{formatElapsed(day.seconds)}</span>
      </h2>
      <ul className="flex flex-col gap-1">
        {day.entries.map((entry) => (
          <li key={entry.id} className="px-2 text-sm">
            <div className="flex gap-3">
              <span className="w-24 text-(--color-text-muted) tabular-nums">
                {clockOf(entry.start)} – {clockOf(entry.end)}
              </span>
              <span className="flex-1">
                {entry.description === '' ? '(no description)' : entry.description}
              </span>
            </div>
            {entry.notes.map((note) => (
              <p
                key={`${note.at}-${note.text}`}
                className="pl-27 text-xs text-(--color-text-muted)"
              >
                {clockOf(note.at)} {note.text}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </section>
  ));

/** The export sheet starts on the project's selected period. */
const initialPeriod = (period: Period, from: LocalDate, to: LocalDate): InitialPeriod => {
  if (period === 'week') {
    return { kind: 'this-week' };
  }
  return period === 'month' ? { kind: 'this-month' } : { kind: 'custom', from, to };
};

/** One project: its entries by day with notes, the period total and the amount at its rate. */
export const ProjectDetail = ({ id }: { readonly id: string }) => {
  const snapshot = useVaultStore((state) => state.snapshot);
  const { period, setPeriod, select, edit } = useProjectsStore();
  const project = snapshot?.projects.get(id);
  const { days, from, to } = useProjectDays(id);
  const [exporting, setExporting] = useState(false);
  if (project === undefined) {
    return null;
  }
  const total = days.reduce((sum, day) => sum + day.seconds, 0);
  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center gap-2">
        <Button
          onClick={() => {
            select(null);
          }}
        >
          ← Projects
        </Button>
        <ProjectDot color={project.color} />
        <h1 className="flex-1 text-lg font-semibold">{project.name}</h1>
        <Button
          onClick={() => {
            setExporting(true);
          }}
        >
          Export CSV
        </Button>
        <Button
          onClick={() => {
            edit({ kind: 'project', id });
          }}
        >
          Edit
        </Button>
      </header>
      <div className="flex items-center gap-2">
        {PERIODS.map((option) => (
          <Button
            key={option.id}
            variant={option.id === period ? 'primary' : 'secondary'}
            onClick={() => {
              setPeriod(option.id);
            }}
          >
            {option.label}
          </Button>
        ))}
        <span className="flex-1" />
        <span className="text-sm">
          Total <span className="font-semibold tabular-nums">{formatElapsed(total)}</span>
          {project.rate === undefined ? null : (
            <span className="text-(--color-text-muted)">
              {' '}
              · {formatMoney(amountFor(total, project.rate))}
            </span>
          )}
        </span>
      </div>
      {days.length === 0 ? (
        <p className="text-sm text-(--color-text-muted)">No time in this period.</p>
      ) : null}
      <DayList days={days} />
      {exporting ? (
        <ExportDialog
          project={id}
          initial={initialPeriod(period, from, to)}
          onClose={() => {
            setExporting(false);
          }}
        />
      ) : null}
    </section>
  );
};
