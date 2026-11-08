import type { SettingsPatch, VaultSettings } from '@ttime/core';

import { Select } from '../../../shared/ui/field';
import { CommitInput } from './commit-input';
import { Row, Section } from './section';

type Props = {
  readonly settings: VaultSettings;
  readonly update: (patch: SettingsPatch) => void;
};

type WeekStart = VaultSettings['weekStartsOn'];
type Weekday = VaultSettings['workingHours']['days'][number];

const WEEK_STARTS: readonly WeekStart[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const WEEKDAYS: readonly { readonly id: Weekday; readonly label: string }[] = [
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
  { id: 'sun', label: 'Sun' },
];

const capitalized = (word: string): string => `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
const weekStartOf = (value: string): WeekStart =>
  WEEK_STARTS.find((day) => day === value) ?? 'monday';

/** Working days as toggles, in week order. */
const WorkingDays = ({ settings, update }: Props) => {
  const { workingHours } = settings;
  const toggle = (day: Weekday) => {
    const on = workingHours.days.includes(day);
    const days = WEEKDAYS.map((weekday) => weekday.id).filter((id) =>
      id === day ? !on : workingHours.days.includes(id),
    );
    update({ workingHours: { ...workingHours, days } });
  };
  return (
    <div className="flex gap-1" role="group" aria-label="Working days">
      {WEEKDAYS.map((day) => {
        const on = workingHours.days.includes(day.id);
        return (
          <button
            key={day.id}
            type="button"
            aria-pressed={on}
            className={`h-8 w-11 rounded-md text-sm ${on ? 'bg-(--color-accent) text-(--color-on-accent)' : 'bg-(--color-control)'}`}
            onClick={() => {
              toggle(day.id);
            }}
          >
            {day.label}
          </button>
        );
      })}
    </div>
  );
};

const TIME = 'w-20 text-center tabular-nums';

/** Week start, day start, working hours (for untracked gaps) and the default currency. */
export const TimeSection = ({ settings, update }: Props) => (
  <Section title="Time">
    <Row label="Week starts on">
      <Select
        aria-label="Week starts on"
        className="w-44"
        value={settings.weekStartsOn}
        onChange={(event) => {
          update({ weekStartsOn: weekStartOf(event.target.value) });
        }}
      >
        {WEEK_STARTS.map((day) => (
          <option key={day} value={day}>
            {capitalized(day)}
          </option>
        ))}
      </Select>
    </Row>
    <Row label="Day starts at">
      <CommitInput
        label="Day starts at"
        className={TIME}
        value={settings.dayStartsAt}
        onCommit={(dayStartsAt) => {
          update({ dayStartsAt });
        }}
      />
      <span className="text-xs text-(--color-text-muted)">
        Entries before this count for the day before.
      </span>
    </Row>
    <Row label="Working days">
      <WorkingDays settings={settings} update={update} />
    </Row>
    <Row label="Working hours">
      <CommitInput
        label="Working hours start"
        className={TIME}
        value={settings.workingHours.start}
        onCommit={(start) => {
          update({ workingHours: { ...settings.workingHours, start } });
        }}
      />
      <span className="text-sm text-(--color-text-muted)">to</span>
      <CommitInput
        label="Working hours end"
        className={TIME}
        value={settings.workingHours.end}
        onCommit={(end) => {
          update({ workingHours: { ...settings.workingHours, end } });
        }}
      />
    </Row>
    <Row label="Currency">
      <CommitInput
        label="Currency"
        className="w-20 text-center uppercase"
        value={settings.defaultCurrency}
        onCommit={(currency) => {
          update({ defaultCurrency: currency.toUpperCase() });
        }}
      />
    </Row>
  </Section>
);
