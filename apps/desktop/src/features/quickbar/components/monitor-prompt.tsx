import { formatElapsed, timestampFromEpoch } from '@ttime/core';
import { useEffect, useRef, useState } from 'react';

import { useNow } from '../../../shared/hooks/use-now';
import { clockOf } from '../../../shared/lib/display';
import { useVaultStore } from '../../../shared/store/vault-store';
import { Button } from '../../../shared/ui/button';
import { Select } from '../../../shared/ui/field';
import { usePromptActions } from '../hooks/use-prompt-actions';
import type { MonitorPrompt } from '../store/quickbar-store';

type IdlePrompt = Extract<MonitorPrompt, { kind: 'idle' }>;
type ForgottenPrompt = Extract<MonitorPrompt, { kind: 'forgotten' }>;

const useClock = () => {
  const zone = useNow().timeZoneId;
  return (seconds: number) => clockOf(timestampFromEpoch(seconds, zone));
};

const useRunningName = (): string => {
  const snapshot = useVaultStore((state) => state.snapshot);
  const running = snapshot?.running ?? null;
  return running === null
    ? 'The timer'
    : (snapshot?.projects.get(running.project)?.name ?? running.project);
};

const IdleAnswers = ({ prompt }: { readonly prompt: IdlePrompt }) => {
  const actions = usePromptActions();
  const projects = useVaultStore((state) => state.snapshot?.projects);
  const active = [...(projects?.values() ?? [])].filter((project) => project.status === 'active');
  const [target, setTarget] = useState(active[0]?.id ?? '');
  const resolve = actions.resolveIdle;
  return (
    <div className="flex flex-col gap-2">
      <Button variant="primary" onClick={actions.keep}>
        Keep all
      </Button>
      <Button
        onClick={() => {
          resolve('discard', prompt.since, prompt.returned);
        }}
      >
        Discard idle time
      </Button>
      <Button
        onClick={() => {
          resolve('discard-stop', prompt.since, prompt.returned);
        }}
      >
        Discard idle time and stop
      </Button>
      <div className="flex gap-2">
        <Select
          aria-label="Project for the idle time"
          className="min-w-0 flex-1"
          value={target}
          onChange={(event) => {
            setTarget(event.target.value);
          }}
        >
          {active.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
        <Button
          disabled={target === ''}
          onClick={() => {
            resolve('assign', prompt.since, prompt.returned, target);
          }}
        >
          Assign idle time
        </Button>
      </div>
    </div>
  );
};

const ForgottenAnswers = ({ prompt }: { readonly prompt: ForgottenPrompt }) => {
  const actions = usePromptActions();
  const clock = useClock();
  return (
    <div className="flex flex-col gap-2">
      <Button variant="primary" onClick={actions.keep}>
        Keep running
      </Button>
      <Button
        onClick={() => {
          actions.stopAt(prompt.lastActivity);
        }}
      >
        Stop at {clock(prompt.lastActivity)}, the last activity
      </Button>
      <Button
        onClick={() => {
          actions.stopAt(null);
        }}
      >
        Stop now
      </Button>
    </div>
  );
};

/** The idle or forgotten-timer question (PRD 6.5). Esc keeps everything as it is. */
export const MonitorPromptView = ({ prompt }: { readonly prompt: MonitorPrompt }) => {
  const clock = useClock();
  const name = useRunningName();
  const sectionRef = useRef<HTMLElement>(null);
  // The safe answer (keep) has focus, so Enter never removes time by accident.
  useEffect(() => {
    sectionRef.current?.querySelector('button')?.focus();
  }, [prompt]);
  return (
    <section ref={sectionRef} className="flex flex-1 flex-col gap-4 overflow-auto p-4">
      {prompt.kind === 'idle' ? (
        <>
          <header className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">You were away</h2>
            <p className="text-sm text-(--color-text-muted)">
              From {clock(prompt.since)} to {clock(prompt.returned)} (
              {formatElapsed(Math.max(0, Math.round(prompt.returned - prompt.since)))}). {name} kept
              running.
            </p>
          </header>
          <IdleAnswers prompt={prompt} />
        </>
      ) : (
        <>
          <header className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">Still working?</h2>
            <p className="text-sm text-(--color-text-muted)">
              {name} has been running for {prompt.hours} hours.
            </p>
          </header>
          <ForgottenAnswers prompt={prompt} />
        </>
      )}
    </section>
  );
};
