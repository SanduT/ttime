import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

import { windowApi } from '../../../shared/bridge/window-api';
import { Checkbox } from '../../../shared/ui/checkbox';
import { keysOf, ShortcutRecorder, usePrefs } from '../../settings';
import { StepTitle } from './intro-steps';

/** True once the quick bar has been opened while this step shows. */
const useQuickbarTried = (): boolean => {
  const [tried, setTried] = useState(false);
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let active = true;
    void windowApi
      .onQuickbarShown(() => {
        setTried(true);
      })
      .then((stop) => {
        if (active) {
          unlisten = stop;
        } else {
          stop();
        }
      });
    return () => {
      active = false;
      unlisten?.();
    };
  }, []);
  return tried;
};

/** The quick bar shortcut as keycaps; it checks itself off when pressed. */
export const ShortcutStep = () => {
  const { prefs, save } = usePrefs();
  const tried = useQuickbarTried();
  const shortcut = prefs?.quickbarShortcut ?? 'Alt+Shift+Space';
  return (
    <div className="flex flex-col gap-6">
      <StepTitle
        step={2}
        title="Your quick bar shortcut"
        body="Press it over any app to start, switch or add a note without leaving what you are doing. Try it now."
      />
      <div className="flex items-center gap-2.5">
        {keysOf(shortcut).map((key) => (
          <kbd
            key={key}
            className="flex h-14 min-w-14 items-center justify-center rounded-xl border border-(--color-border-strong) bg-(--color-raised) px-4 font-sans text-xl font-medium shadow-[0_2px_0_var(--color-border-strong)]"
          >
            {key}
          </kbd>
        ))}
        {tried ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            className="ml-3 flex items-center gap-2 text-sm font-semibold text-(--color-accent)"
          >
            <Check size={18} strokeWidth={2.5} />
            It works
          </motion.span>
        ) : null}
      </div>
      <div className="flex items-center gap-3 text-sm text-(--color-text-muted)">
        Prefer another one?
        <ShortcutRecorder
          value={shortcut}
          onChange={(quickbarShortcut) => {
            save({ quickbarShortcut });
          }}
        />
      </div>
    </div>
  );
};

/** Where the timer lives, and launch at login. */
export const MenuBarStep = () => {
  const { launchAtLogin, saveLaunchAtLogin } = usePrefs();
  return (
    <div className="flex flex-col gap-6">
      <StepTitle
        step={3}
        title="ttime lives in your menu bar"
        body="The running timer shows up there. Click it for today's totals and recent entries, or right-click for quick actions."
      />
      <div className="flex h-9 items-center justify-end gap-5 rounded-xl border border-(--color-border) bg-(--color-raised) px-4 text-[13px] text-(--color-text-muted)">
        <span>Mon 9:41</span>
        <span className="relative flex items-center gap-1.5 rounded-md px-2 py-0.5 text-(--color-text)">
          <span className="absolute inset-0 animate-ping rounded-md bg-(--color-accent-tint)" />
          <span className="animate-breathe relative size-2 rounded-full bg-(--color-accent)" />
          <span className="relative tabular-nums">1:17</span>
        </span>
      </div>
      <div className="rounded-xl border border-(--color-border) bg-(--color-raised) px-4 py-2">
        <Checkbox
          label="Open ttime at login"
          checked={launchAtLogin ?? false}
          disabled={launchAtLogin === null}
          onChange={saveLaunchAtLogin}
        />
      </div>
    </div>
  );
};
