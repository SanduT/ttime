import { useEffect } from 'react';

import { windowApi } from '../../../shared/bridge/window-api';
import { runAction } from '../../../shared/lib/run-action';
import { useQuickbarStore } from '../store/quickbar-store';

/** Resets the quick bar and calls `focus` each time Rust shows it. */
export const useQuickbarShown = (focus: () => void): void => {
  const open = useQuickbarStore((state) => state.open);

  useEffect(() => {
    let active = true;
    let unlisten: (() => void) | undefined;
    void runAction('Listen for the quick bar', async () => {
      const stop = await windowApi.onQuickbarShown((mode) => {
        open(mode);
        // Wait for React to render the reset panel before focusing.
        requestAnimationFrame(focus);
      });
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
  }, [open, focus]);
};
