import type { LocalDate, Timestamp } from '@ttime/core';
import { useEffect, useRef, useState } from 'react';

import { useNow } from '../../../shared/hooks/use-now';
import { Button } from '../../../shared/ui/button';
import { TextInput } from '../../../shared/ui/field';
import { type EntryDraft, rangeOf } from '../lib/entry-draft';
import { ProjectSelect } from './project-select';

/** What the form submits. */
export type EntryValues = {
  readonly description: string;
  readonly project: string;
  readonly start: Timestamp;
  readonly end: Timestamp;
};

type Props = {
  readonly date: LocalDate;
  readonly initial: EntryDraft;
  readonly submitLabel: string;
  /** Resolves true when saved, so the form closes. */
  readonly onSubmit: (values: EntryValues) => Promise<boolean>;
  readonly onCancel: () => void;
  /** Extra buttons, such as Delete. */
  readonly extra?: React.ReactNode;
};

const TIME_INPUT = 'w-16 text-center tabular-nums';

type RangeProps = {
  readonly draft: EntryDraft;
  readonly onChange: (patch: Partial<EntryDraft>) => void;
};

/** Start, end and project on one line. */
const RangeFields = ({ draft, onChange }: RangeProps) => (
  <div className="flex items-center gap-2">
    <TextInput
      aria-label="Start"
      className={TIME_INPUT}
      value={draft.start}
      onChange={(event) => {
        onChange({ start: event.target.value });
      }}
    />
    <span className="text-(--color-text-muted)">to</span>
    <TextInput
      aria-label="End"
      className={TIME_INPUT}
      value={draft.end}
      onChange={(event) => {
        onChange({ end: event.target.value });
      }}
    />
    <ProjectSelect
      value={draft.project}
      onChange={(project) => {
        onChange({ project });
      }}
    />
  </div>
);

/** Edits description, project, start and end. Enter saves, Esc cancels. */
export const EntryForm = ({ date, initial, submitLabel, onSubmit, onCancel, extra }: Props) => {
  const [draft, setDraft] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const zone = useNow().timeZoneId;
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const form = formRef.current;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancel();
      }
    };
    form?.addEventListener('keydown', onKey);
    return () => {
      form?.removeEventListener('keydown', onKey);
    };
  }, [onCancel]);
  const set = (patch: Partial<EntryDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setMessage(null);
  };
  const submit = async () => {
    const range = rangeOf(draft, date, zone);
    if (!range.ok) {
      setMessage(range.message);
      return;
    }
    if (draft.project === '') {
      setMessage('Choose a project.');
      return;
    }
    const { start, end } = range;
    if (await onSubmit({ description: draft.description, project: draft.project, start, end })) {
      onCancel();
    }
  };
  return (
    <form
      ref={formRef}
      className="flex flex-col gap-2 rounded-lg border border-(--color-border) bg-(--color-control) p-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <RangeFields draft={draft} onChange={set} />
      <TextInput
        aria-label="Description"
        placeholder="What did you work on?"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the form opens because the user asked to edit
        autoFocus
        value={draft.description}
        onChange={(e) => {
          set({ description: e.target.value });
        }}
      />
      {message === null ? null : <p className="text-xs text-(--color-danger)">{message}</p>}
      <div className="flex gap-2">
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
        <span className="flex-1" />
        {extra}
      </div>
    </form>
  );
};
