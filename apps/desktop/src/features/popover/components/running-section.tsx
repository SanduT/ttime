import { Pencil, Play, Plus, Square, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

import { useElapsed } from '../../../shared/hooks/use-elapsed';
import { useResumeTarget } from '../../../shared/hooks/use-resume-target';
import { clockOf, FALLBACK_COLOR } from '../../../shared/lib/display';
import { useVaultStore } from '../../../shared/store/vault-store';
import { Button } from '../../../shared/ui/button';
import { ElapsedClock } from '../../../shared/ui/elapsed-clock';
import { ProjectDot } from '../../../shared/ui/project-dot';
import type { PopoverActions } from '../hooks/use-popover-actions';
import { Card } from './card';

/** Notes shown under the running entry. */
const LATEST_NOTES = 3;

type Props = { readonly actions: PopoverActions };

/** Discard with a second click to confirm. */
const DiscardButton = ({ onDiscard }: { readonly onDiscard: () => void }) => {
  const [confirming, setConfirming] = useState(false);
  return (
    <Button
      variant="ghost"
      aria-label={confirming ? 'Confirm discard' : 'Discard'}
      title={confirming ? 'Click again to discard' : 'Discard'}
      className={confirming ? 'px-2 text-(--color-danger)' : 'px-2'}
      onBlur={() => {
        setConfirming(false);
      }}
      onClick={() => {
        if (confirming) {
          onDiscard();
        }
        setConfirming(!confirming);
      }}
    >
      <Trash2 size={14} />
      {confirming ? 'Discard?' : null}
    </Button>
  );
};

/** Nothing runs: resume the last entry or start something new. */
const IdleSection = ({ actions }: Props) => {
  const resume = useResumeTarget();
  return (
    <Card label="Not tracking" className="flex flex-col gap-3 p-4">
      <p className="text-xs text-(--color-text-muted)">Nothing running</p>
      {resume === null ? null : (
        <button
          type="button"
          className="flex h-10 items-center gap-2.5 rounded-[10px] bg-(--color-accent-tint) px-3 text-left text-sm font-medium transition-transform active:scale-[0.98]"
          onClick={() => void actions.resume()}
        >
          <Play size={14} className="fill-(--color-accent) text-(--color-accent)" />
          <span className="min-w-0 flex-1 truncate">Resume {resume.label}</span>
        </button>
      )}
      <Button variant="primary" onClick={() => void actions.newEntry()}>
        <Plus size={14} strokeWidth={2.5} />
        New entry
      </Button>
    </Card>
  );
};

/** A soft wash of the project's color behind the running card. */
const Glow = ({ color }: { readonly color: string }) => (
  <div
    aria-hidden
    className="animate-glow pointer-events-none absolute inset-0 rounded-[14px]"
    style={{
      background: `radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, ${color} 14%, transparent), transparent 60%)`,
    }}
  />
);

/** The running entry with its notes and controls, or the idle card. */
export const RunningSection = ({ actions }: Props) => {
  const running = useVaultStore((state) => state.snapshot?.running ?? null);
  const project = useVaultStore((state) =>
    running === null ? undefined : state.snapshot?.projects.get(running.project),
  );
  const elapsed = useElapsed(running?.start ?? null);
  if (running === null) {
    return <IdleSection actions={actions} />;
  }
  const color = project?.color ?? FALLBACK_COLOR;
  return (
    <Card label="Running" className="flex flex-col gap-3 p-4">
      <Glow color={color} />
      <div className="relative flex items-center gap-2 text-xs text-(--color-text-muted)">
        <ProjectDot color={color} running />
        <span className="font-semibold" style={{ color }}>
          {project?.name ?? running.project}
        </span>
        <span>· since {clockOf(running.start)}</span>
      </div>
      <div className="relative flex flex-col gap-0.5">
        <p className="truncate text-[15px] font-semibold tracking-[-0.01em]">
          {running.description === '' ? '(no description)' : running.description}
        </p>
        <ElapsedClock
          seconds={elapsed}
          className="text-[40px] leading-tight font-semibold tracking-[-0.03em]"
        />
      </div>
      {running.notes.length === 0 ? null : (
        <ol className="relative flex flex-col gap-1 text-xs text-(--color-text-muted)">
          {running.notes.slice(-LATEST_NOTES).map((note) => (
            <motion.li
              key={`${note.at}-${note.text}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2"
            >
              <span className="text-(--color-text-faint) tabular-nums">{clockOf(note.at)}</span>
              <span className="min-w-0 flex-1 truncate">{note.text}</span>
            </motion.li>
          ))}
        </ol>
      )}
      <div className="relative flex gap-2">
        <Button variant="primary" className="flex-[1.2]" onClick={() => void actions.stop()}>
          <Square size={11} className="fill-current" />
          Stop
        </Button>
        <Button className="flex-1" onClick={() => void actions.addNote()}>
          <Pencil size={13} />
          Note
        </Button>
        <Button className="flex-1" onClick={() => void actions.newEntry()}>
          Switch
        </Button>
        <DiscardButton onDiscard={() => void actions.discard()} />
      </div>
    </Card>
  );
};
