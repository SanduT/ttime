import { formatElapsed, type RunningEntry } from '@ttime/core';

import { windowApi } from '../../../shared/bridge/window-api';
import { useElapsed } from '../../../shared/hooks/use-elapsed';
import { clockOf, FALLBACK_COLOR } from '../../../shared/lib/display';
import { runAction } from '../../../shared/lib/run-action';
import { useVaultStore } from '../../../shared/store/vault-store';
import { ProjectDot } from '../../../shared/ui/project-dot';
import { Notes } from './notes';

/** The running entry. Click edits it in the quick bar, where the timer lives. */
export const RunningRow = ({ entry }: { readonly entry: RunningEntry }) => {
  const project = useVaultStore((state) => state.snapshot?.projects.get(entry.project));
  const elapsed = useElapsed(entry.start);
  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-md bg-(--color-control) px-2 py-1.5 text-left text-sm"
        onClick={() =>
          void runAction('Edit running entry', () => windowApi.showQuickbar('edit-running'))
        }
      >
        <span className="w-24 shrink-0 text-(--color-text-muted) tabular-nums">
          {clockOf(entry.start)} – now
        </span>
        <ProjectDot color={project?.color ?? FALLBACK_COLOR} />
        <span className="min-w-0 flex-1 truncate">
          {entry.description === '' ? (
            <span className="text-(--color-text-muted)">(no description)</span>
          ) : (
            entry.description
          )}
        </span>
        <span className="text-xs text-(--color-text-muted)">{project?.name ?? entry.project}</span>
        <span className="w-12 text-right font-medium tabular-nums">{formatElapsed(elapsed)}</span>
      </button>
      <Notes notes={entry.notes} />
    </li>
  );
};
