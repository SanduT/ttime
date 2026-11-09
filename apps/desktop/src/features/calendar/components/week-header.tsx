import { formatElapsed, type WeekView } from '@ttime/core';

import { Button } from '../../../shared/ui/button';
import { weekdayName, weekTitle } from '../lib/layout';
import { useCalendarStore } from '../store/calendar-store';

/** Week title, navigation and total, then each day's name, date and total over its column. */
export const WeekHeader = ({
  week,
  today,
}: {
  readonly week: WeekView;
  readonly today: string;
}) => {
  const { step, goToday } = useCalendarStore();
  const first = week.days[0]?.date ?? today;
  const last = week.days.at(-1)?.date ?? today;
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h1 className="flex-1 text-[28px] font-bold tracking-[-0.025em]">
          {weekTitle(first, last)}
        </h1>
        <span className="text-sm text-(--color-text-muted)">
          Total{' '}
          <span className="font-semibold text-(--color-text) tabular-nums">
            {formatElapsed(week.seconds)}
          </span>
        </span>
        <Button
          aria-label="Previous week"
          onClick={() => {
            step(-1);
          }}
        >
          ←
        </Button>
        <Button onClick={goToday}>This week</Button>
        <Button
          aria-label="Next week"
          onClick={() => {
            step(1);
          }}
        >
          →
        </Button>
      </div>
      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] text-xs">
        <span />
        {week.days.map((day) => (
          <div
            key={day.date}
            className={`flex justify-between px-1.5 ${day.date === today ? 'font-semibold text-(--color-accent)' : 'text-(--color-text-muted)'}`}
          >
            <span>
              {weekdayName(day.dayOfWeek)} {String(Number(day.date.slice(8, 10)))}
            </span>
            <span className="tabular-nums">
              {day.seconds === 0 ? '' : formatElapsed(day.seconds)}
            </span>
          </div>
        ))}
      </div>
    </header>
  );
};
