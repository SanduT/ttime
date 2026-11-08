import { type Entry, recentEntries } from '@ttime/core';
import { useMemo } from 'react';

import { FALLBACK_COLOR } from '../../../shared/lib/display';
import { useVaultStore } from '../../../shared/store/vault-store';
import { ProjectDot } from '../../../shared/ui/project-dot';
import type { PopoverActions } from '../hooks/use-popover-actions';

/** Recent entries listed in the popover. */
const RECENT_COUNT = 5;

type Props = { readonly actions: PopoverActions };

/** Recent unique entries, each started with one click. */
export const RecentSection = ({ actions }: Props) => {
  const snapshot = useVaultStore((state) => state.snapshot);
  const recent = useMemo(() => {
    const entries: Entry[] = [...(snapshot?.days.values() ?? [])].flatMap((day) => day.entries);
    return recentEntries(entries, { limit: RECENT_COUNT });
  }, [snapshot]);
  if (recent.length === 0) {
    return null;
  }
  return (
    <section aria-label="Recent" className="border-t border-(--color-border) px-2 py-2">
      <h2 className="px-2 pb-1 text-xs font-medium text-(--color-text-muted)">Recent</h2>
      <ul>
        {recent.map((item) => {
          const project = snapshot?.projects.get(item.project);
          return (
            <li key={`${item.project}-${item.description}`}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-(--color-control)"
                onClick={() => void actions.continueRecent(item)}
              >
                <ProjectDot color={project?.color ?? FALLBACK_COLOR} />
                <span className="min-w-0 flex-1 truncate">
                  {item.description === '' ? '(no description)' : item.description}
                </span>
                <span className="text-xs text-(--color-text-muted)">
                  {project?.name ?? item.project}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
