import { type Entry, recentEntries } from '@ttime/core';
import { Play } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo } from 'react';

import { FALLBACK_COLOR } from '../../../shared/lib/display';
import { useVaultStore } from '../../../shared/store/vault-store';
import { ProjectDot } from '../../../shared/ui/project-dot';
import type { PopoverActions } from '../hooks/use-popover-actions';
import { Card, CardLabel } from './card';

/** Recent entries listed in the popover. */
const RECENT_COUNT = 5;
/** Delay between rows as they appear, in seconds. */
const STAGGER = 0.04;

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
    <Card label="Recent" className="p-1.5">
      <CardLabel>Recent</CardLabel>
      <ul>
        {recent.map((item, index) => {
          const project = snapshot?.projects.get(item.project);
          return (
            <motion.li
              key={`${item.project}-${item.description}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * STAGGER, duration: 0.25 }}
            >
              <button
                type="button"
                className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13px] transition-colors hover:bg-(--color-hover)"
                onClick={() => void actions.continueRecent(item)}
              >
                <ProjectDot color={project?.color ?? FALLBACK_COLOR} />
                <span className="min-w-0 flex-1 truncate">
                  {item.description === '' ? '(no description)' : item.description}
                </span>
                <span className="text-xs text-(--color-text-muted) group-hover:hidden">
                  {project?.name ?? item.project}
                </span>
                <Play
                  size={12}
                  aria-hidden
                  className="hidden fill-(--color-accent) text-(--color-accent) group-hover:block"
                />
              </button>
            </motion.li>
          );
        })}
      </ul>
    </Card>
  );
};
