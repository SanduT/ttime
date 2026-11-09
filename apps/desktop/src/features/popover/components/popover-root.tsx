import { motion } from 'motion/react';

import { useShownCount } from '../../../shared/hooks/use-shown-count';
import { useVaultLoader } from '../../vault';
import { usePopoverActions } from '../hooks/use-popover-actions';
import { RecentSection } from './recent-section';
import { RunningSection } from './running-section';
import { TotalsSection } from './totals-section';

/** Days loaded: this week (up to 7 days back) plus a day for `dayStartsAt`. */
const LOADED_DAYS = 8;

const FOOTER_BUTTON =
  'rounded-md px-2 py-1 text-xs text-(--color-text-muted) transition-colors hover:bg-(--color-hover) hover:text-(--color-text)';

/** The menu bar popover (PRD 6.2). */
export const PopoverRoot = () => {
  const status = useVaultLoader({ days: LOADED_DAYS });
  const actions = usePopoverActions();
  const shown = useShownCount();
  if (status === 'loading') {
    return null;
  }
  return (
    <motion.main
      key={shown}
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 36 }}
      className="flex h-screen origin-top flex-col overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface)"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {status === 'ready' ? (
          <>
            <RunningSection actions={actions} />
            <RecentSection actions={actions} />
            <TotalsSection />
          </>
        ) : (
          <p className="p-4 text-sm text-(--color-text-muted)">
            No vault is open yet. Open ttime to create or choose one.
          </p>
        )}
      </div>
      <footer className="flex gap-1 border-t border-(--color-border) px-2 py-1.5">
        <button type="button" className={FOOTER_BUTTON} onClick={() => void actions.openMain()}>
          Open ttime
        </button>
        <span className="flex-1" />
        <button type="button" className={FOOTER_BUTTON} onClick={() => void actions.quit()}>
          Quit
        </button>
      </footer>
    </motion.main>
  );
};
