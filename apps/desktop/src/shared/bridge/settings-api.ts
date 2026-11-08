import {
  type Appearance,
  commands,
  events,
  type MenuBarDisplay,
  type Prefs as PrefsInput,
  type Prefs_Serialize,
} from './bindings';
import { unwrap } from './ipc';

/** The app preferences (Rust `prefs.json`), as Rust returns them. */
export type Prefs = Prefs_Serialize;
export type { Appearance, MenuBarDisplay };

/** App preferences, launch at login and the tray's Settings item. */
export type SettingsApi = {
  readonly prefs: () => Promise<Prefs>;
  /** Applies and saves; a taken shortcut fails and the old one keeps working. */
  readonly setPrefs: (prefs: PrefsInput) => Promise<Prefs>;
  readonly launchAtLogin: () => Promise<boolean>;
  readonly setLaunchAtLogin: (enabled: boolean) => Promise<null>;
  /** Calls `onOpen` when the tray asks the main window for Settings. Returns unlisten. */
  readonly onOpenSettings: (onOpen: () => void) => Promise<() => void>;
};

export const settingsApi: SettingsApi = {
  prefs: () => unwrap(commands.prefsGet()),
  setPrefs: (prefs) => unwrap(commands.prefsSet(prefs)),
  launchAtLogin: () => unwrap(commands.launchAtLoginGet()),
  setLaunchAtLogin: (enabled) => unwrap(commands.launchAtLoginSet(enabled)),
  onOpenSettings: (onOpen) =>
    events.mainOpenSettings.listen(() => {
      onOpen();
    }),
};
