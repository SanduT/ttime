import { type DayShare, formatElapsed, type ProjectShare } from '@ttime/core';

import { ChartCard } from './chart-card';

const CHART_PX = 160;

type Props = {
  readonly days: readonly DayShare[];
  readonly projects: readonly ProjectShare[];
};

/** Day number under each bar for up to a month; otherwise the month at its first day. */
const labelOf = (date: string, count: number): string => {
  if (count <= 31) {
    return String(Number(date.slice(8, 10)));
  }
  return date.endsWith('-01') ? date.slice(5, 7) : '';
};

/** Hours per day, stacked by project in the same colors and order as the project bars. */
export const DayChart = ({ days, projects }: Props) => {
  const max = Math.max(...days.map((day) => day.seconds), 1);
  const colors = new Map(projects.map((project) => [project.project, project.color]));
  return (
    <ChartCard title="Hours per day">
      <div className="flex items-end gap-px" style={{ height: CHART_PX }}>
        {days.map((day) => (
          <div
            key={day.date}
            title={`${day.date}: ${formatElapsed(day.seconds)}`}
            className="flex min-w-0 flex-1 flex-col-reverse overflow-hidden rounded-t-sm"
            style={{ height: `${String((day.seconds / max) * 100)}%` }}
          >
            {day.byProject.map((part) => (
              <span
                key={part.project}
                className="block w-full"
                style={{ flexGrow: part.seconds, background: colors.get(part.project) }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex gap-px text-[10px] text-(--color-text-muted)">
        {days.map((day) => (
          <span key={day.date} className="min-w-0 flex-1 text-center tabular-nums">
            {labelOf(day.date, days.length)}
          </span>
        ))}
      </div>
    </ChartCard>
  );
};
