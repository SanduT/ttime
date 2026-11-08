import type { Project, RunningEntry, RunningPatch } from '@ttime/core';
import { useEffect, useRef, useState } from 'react';

import { createSystemClock } from '../../../shared/adapters/system';
import { Button } from '../../../shared/ui/button';
import { clockOf, timestampAt } from '../lib/clock-input';
import { useQuickbarStore } from '../store/quickbar-store';

type Props = {
  readonly running: RunningEntry;
  readonly projects: readonly Project[];
  readonly onSave: (patch: RunningPatch) => void;
};

const clock = createSystemClock();

const FIELD =
  'w-full rounded-md border border-(--color-border) bg-(--color-control) px-2 py-1.5 text-sm outline-none focus:border-(--color-accent)';

/** Edits the running entry's project, description and start time (⌘E). */
export const EditRunning = ({ running, projects, onSave }: Props) => {
  const [project, setProject] = useState(running.project);
  const [description, setDescription] = useState(running.description);
  const [time, setTime] = useState(() => clockOf(running.start));
  const original = clockOf(running.start);
  // An unchanged time keeps the stored start, which may be on an earlier day.
  const start = time === original ? running.start : timestampAt(time, clock.now());
  const error = useQuickbarStore((state) => state.error);
  const clearError = useQuickbarStore((state) => state.clearError);
  const descriptionRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    descriptionRef.current?.focus();
  }, []);
  const active = projects.filter((item) => item.status === 'active' || item.id === running.project);

  return (
    <form
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 text-sm"
      onSubmit={(event) => {
        event.preventDefault();
        if (start !== null) {
          // A second Enter after an overlap error trims the earlier entry, as the hint says.
          const trim = error?.trimmable === true ? { onConflict: 'trim' as const } : {};
          onSave({ project, description, start, ...trim });
        }
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="text-(--color-text-muted)">Project</span>
        <select
          className={FIELD}
          value={project}
          onChange={(event) => {
            setProject(event.target.value);
            clearError();
          }}
        >
          {active.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-(--color-text-muted)">Description</span>
        <input
          ref={descriptionRef}
          className={FIELD}
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            clearError();
          }}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-(--color-text-muted)">Started at (today, HH:MM)</span>
        <input
          className={FIELD}
          value={time}
          aria-invalid={start === null}
          onChange={(event) => {
            setTime(event.target.value);
            clearError();
          }}
        />
      </label>
      {error === null ? null : (
        <p role="alert" className="rounded-lg bg-(--color-control) px-3 py-2 text-(--color-danger)">
          {error.message}
          {error.trimmable ? ' Press ↵ again to trim the earlier entry and save.' : ''}
        </p>
      )}
      <Button type="submit" variant="primary" disabled={start === null} className="self-end">
        Save
      </Button>
    </form>
  );
};
