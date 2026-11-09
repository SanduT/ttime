import { windowApi } from '../../../shared/bridge/window-api';
import { useElapsed } from '../../../shared/hooks/use-elapsed';
import { FALLBACK_COLOR } from '../../../shared/lib/display';
import { runAction } from '../../../shared/lib/run-action';
import { useVaultStore } from '../../../shared/store/vault-store';
import { ElapsedClock } from '../../../shared/ui/elapsed-clock';
import { ProjectDot } from '../../../shared/ui/project-dot';

/** The running entry pinned to the bottom of the sidebar. Click edits it in the quick bar. */
export const SidebarRunning = () => {
  const running = useVaultStore((state) => state.snapshot?.running ?? null);
  const project = useVaultStore((state) =>
    running === null ? undefined : state.snapshot?.projects.get(running.project),
  );
  const elapsed = useElapsed(running?.start ?? null);
  if (running === null) {
    return null;
  }
  return (
    <button
      type="button"
      className="flex flex-col gap-1 rounded-xl border border-(--color-border) bg-(--color-raised) p-3 text-left shadow-(--shadow-card) transition-transform active:scale-[0.98]"
      onClick={() =>
        void runAction('Edit running entry', () => windowApi.showQuickbar('edit-running'))
      }
    >
      <span className="flex items-center gap-2 text-xs text-(--color-text-muted)">
        <ProjectDot color={project?.color ?? FALLBACK_COLOR} running />
        <span className="truncate">{project?.name ?? running.project}</span>
      </span>
      <span className="truncate text-[13px] font-medium">
        {running.description === '' ? '(no description)' : running.description}
      </span>
      <ElapsedClock seconds={elapsed} className="text-xl font-semibold tracking-[-0.02em]" />
    </button>
  );
};
