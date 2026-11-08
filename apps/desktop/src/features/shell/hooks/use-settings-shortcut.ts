import { useEffect } from 'react';

import { settingsApi } from '../../../shared/bridge/settings-api';
import { runAction } from '../../../shared/lib/run-action';
import { useNavStore } from '../store/nav-store';

/** ⌘, and the tray's Settings… item open the Settings view. */
export const useSettingsShortcut = (): void => {
  const go = useNavStore((state) => state.go);
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.metaKey && event.key === ',') {
        event.preventDefault();
        go('settings');
      }
    };
    window.addEventListener('keydown', onKey);
    let unlisten: (() => void) | undefined;
    let active = true;
    void runAction('Listen for Settings', async () => {
      const stop = await settingsApi.onOpenSettings(() => {
        go('settings');
      });
      if (active) {
        unlisten = stop;
      } else {
        stop();
      }
    });
    return () => {
      active = false;
      window.removeEventListener('keydown', onKey);
      unlisten?.();
    };
  }, [go]);
};
