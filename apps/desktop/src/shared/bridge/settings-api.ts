import {
  type Accent,
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
export type { Accent, Appearance, MenuBarDisplay };

/** App preferences, launch at login and the tray's Settings item. */
export type SettingsApi = {
  readonly prefs: () => Promise<Prefs>;
  /** Applies and saves; a taken shortcut fails and the old one keeps working. */
  readonly setPrefs: (prefs: PrefsInput) => Promise<Prefs>;
  readonly launchAtLogin: () => Promise<boolean>;
  readonly setLaunchAtLogin: (enabled: boolean) => Promise<null>;
  /** Calls `onChange` when the accent changes in any window. Returns unlisten. */
  readonly onAccentChanged: (onChange: (accent: Accent) => void) => Promise<() => void>;
  /** Calls `onOpen` when the tray asks the main window for Settings. Returns unlisten. */
  readonly onOpenSettings: (onOpen: () => void) => Promise<() => void>;
};

export const settingsApi: SettingsApi = {
  prefs: () => unwrap(commands.prefsGet()),
  setPrefs: (prefs) => unwrap(commands.prefsSet(prefs)),
  launchAtLogin: () => unwrap(commands.launchAtLoginGet()),
  setLaunchAtLogin: (enabled) => unwrap(commands.launchAtLoginSet(enabled)),
  onAccentChanged: (onChange) =>
    events.prefsAccent.listen((event) => {
      onChange(event.payload.accent);
    }),
  onOpenSettings: (onOpen) =>
    events.mainOpenSettings.listen(() => {
      onOpen();
    }),
};
