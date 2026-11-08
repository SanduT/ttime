import { formatElapsed } from '@ttime/core';

import { useElapsed } from '../../../shared/hooks/use-elapsed';
import { clockOf, FALLBACK_COLOR } from '../../../shared/lib/display';
import { useVaultStore } from '../../../shared/store/vault-store';
import { ProjectDot } from '../../../shared/ui/project-dot';

/** The running entry with its elapsed time, or "Not tracking". */
export const RunningHeader = () => {
  const running = useVaultStore((state) => state.snapshot?.running ?? null);
  const project = useVaultStore((state) =>
    running === null ? undefined : state.snapshot?.projects.get(running.project),
  );
  const elapsed = useElapsed(running?.start ?? null);

  if (running === null) {
    return <header className="px-4 pt-3 text-sm text-(--color-text-muted)">Not tracking</header>;
  }
  return (
    <header className="flex items-center gap-2 px-4 pt-3 text-sm">
      <ProjectDot color={project?.color ?? FALLBACK_COLOR} />
      <span className="font-medium">{project?.name ?? running.project}</span>
      <span className="min-w-0 flex-1 truncate text-(--color-text-muted)">
        {running.description}
      </span>
      <span className="text-(--color-text-muted)">since {clockOf(running.start)}</span>
      <span className="font-medium tabular-nums">{formatElapsed(elapsed, { seconds: true })}</span>
    </header>
  );
};
