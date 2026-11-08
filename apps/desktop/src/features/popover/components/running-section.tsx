import { formatElapsed } from '@ttime/core';
import { useState } from 'react';

import { useElapsed } from '../../../shared/hooks/use-elapsed';
import { useResumeTarget } from '../../../shared/hooks/use-resume-target';
import { clockOf, FALLBACK_COLOR } from '../../../shared/lib/display';
import { useVaultStore } from '../../../shared/store/vault-store';
import { Button } from '../../../shared/ui/button';
import { ProjectDot } from '../../../shared/ui/project-dot';
import type { PopoverActions } from '../hooks/use-popover-actions';

/** Notes shown under the running entry. */
const LATEST_NOTES = 3;

type Props = { readonly actions: PopoverActions };

/** Discard with a second click to confirm. */
const DiscardButton = ({ onDiscard }: { readonly onDiscard: () => void }) => {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button
        onClick={() => {
          setConfirming(true);
        }}
      >
        Discard
      </Button>
    );
  }
  return (
    <Button
      className="text-(--color-danger)"
      onBlur={() => {
        setConfirming(false);
      }}
      onClick={() => {
        setConfirming(false);
        onDiscard();
      }}
    >
      Confirm discard
    </Button>
  );
};

/** Nothing runs: start something new or resume the last entry. */
const IdleSection = ({ actions }: Props) => {
  const resume = useResumeTarget();
  return (
    <section className="flex flex-col gap-3 p-4">
      <p className="text-sm text-(--color-text-muted)">Not tracking</p>
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => void actions.newEntry()}>
          New…
        </Button>
        {resume === null ? null : (
          <Button className="min-w-0" onClick={() => void actions.resume()}>
            <span className="truncate">Resume {resume.label}</span>
          </Button>
        )}
      </div>
    </section>
  );
};

/** The running entry with its notes and controls, or "Not tracking". */
export const RunningSection = ({ actions }: Props) => {
  const running = useVaultStore((state) => state.snapshot?.running ?? null);
  const project = useVaultStore((state) =>
    running === null ? undefined : state.snapshot?.projects.get(running.project),
  );
  const elapsed = useElapsed(running?.start ?? null);

  if (running === null) {
    return <IdleSection actions={actions} />;
  }
  return (
    <section className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2 text-sm">
        <ProjectDot color={project?.color ?? FALLBACK_COLOR} />
        <span className="font-medium">{project?.name ?? running.project}</span>
        <span className="flex-1" />
        <span className="text-(--color-text-muted)">since {clockOf(running.start)}</span>
      </div>
      <p className="truncate text-sm">
        {running.description === '' ? '(no description)' : running.description}
      </p>
      <p className="text-3xl font-semibold tabular-nums">
        {formatElapsed(elapsed, { seconds: true })}
      </p>
      {running.notes.length === 0 ? null : (
        <ol className="flex flex-col gap-0.5 text-xs text-(--color-text-muted)">
          {running.notes.slice(-LATEST_NOTES).map((note) => (
            <li key={`${note.at}-${note.text}`} className="flex gap-2">
              <span className="tabular-nums">{clockOf(note.at)}</span>
              <span className="min-w-0 flex-1 truncate">{note.text}</span>
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button variant="primary" onClick={() => void actions.stop()}>
          Stop
        </Button>
        <Button onClick={() => void actions.addNote()}>Add note…</Button>
        <Button onClick={() => void actions.newEntry()}>Switch…</Button>
        <DiscardButton onDiscard={() => void actions.discard()} />
      </div>
    </section>
  );
};
