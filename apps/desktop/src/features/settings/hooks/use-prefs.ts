import { useEffect, useState } from 'react';

import { type Prefs, settingsApi } from '../../../shared/bridge/settings-api';
import { runAction } from '../../../shared/lib/run-action';

/** The app preferences and launch at login, loaded from Rust and saved on every change. */
export const usePrefs = () => {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [launchAtLogin, setLaunchAtLogin] = useState<boolean | null>(null);
  useEffect(() => {
    void runAction('Load settings', async () => {
      setPrefs(await settingsApi.prefs());
      setLaunchAtLogin(await settingsApi.launchAtLogin());
    });
  }, []);
  const save = (patch: Partial<Prefs>) => {
    if (prefs === null) {
      return;
    }
    void runAction('Save settings', async () => {
      setPrefs(await settingsApi.setPrefs({ ...prefs, ...patch }));
    });
  };
  const saveLaunchAtLogin = (enabled: boolean) => {
    void runAction('Launch at login', async () => {
      await settingsApi.setLaunchAtLogin(enabled);
      setLaunchAtLogin(await settingsApi.launchAtLogin());
    });
  };
  return { prefs, save, launchAtLogin, saveLaunchAtLogin };
};

/** What `usePrefs` returns, shared by the Settings sections so they save one copy. */
export type PrefsState = ReturnType<typeof usePrefs>;
