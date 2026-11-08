import type { Appearance, MenuBarDisplay } from '../../../shared/bridge/settings-api';
import { Checkbox } from '../../../shared/ui/checkbox';
import { Select } from '../../../shared/ui/field';
import { usePrefs } from '../hooks/use-prefs';
import { Row, Section } from './section';
import { ShortcutRecorder } from './shortcut-recorder';

const DISPLAYS: readonly { readonly id: MenuBarDisplay; readonly label: string }[] = [
  { id: 'time', label: 'Time' },
  { id: 'project-and-time', label: 'Project and time' },
  { id: 'icon', label: 'Icon only' },
];

const APPEARANCES: readonly { readonly id: Appearance; readonly label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

const displayOf = (value: string): MenuBarDisplay =>
  DISPLAYS.find((display) => display.id === value)?.id ?? 'time';
const appearanceOf = (value: string): Appearance =>
  APPEARANCES.find((appearance) => appearance.id === value)?.id ?? 'system';

/** App preferences: the quick bar shortcut, menu bar, appearance and launch at login. */
export const AppSection = () => {
  const { prefs, save, launchAtLogin, saveLaunchAtLogin } = usePrefs();
  if (prefs === null) {
    return null;
  }
  return (
    <Section title="App">
      <Row label="Quick bar shortcut">
        <ShortcutRecorder
          value={prefs.quickbarShortcut}
          onChange={(quickbarShortcut) => {
            save({ quickbarShortcut });
          }}
        />
      </Row>
      <Row label="Menu bar">
        <Select
          aria-label="Menu bar while tracking"
          className="w-44"
          value={prefs.menuBarDisplay}
          onChange={(event) => {
            save({ menuBarDisplay: displayOf(event.target.value) });
          }}
        >
          {DISPLAYS.map((display) => (
            <option key={display.id} value={display.id}>
              {display.label}
            </option>
          ))}
        </Select>
        <Checkbox
          label="Show seconds"
          checked={prefs.showSeconds}
          disabled={prefs.menuBarDisplay === 'icon'}
          onChange={(showSeconds) => {
            save({ showSeconds });
          }}
        />
      </Row>
      <Row label="Appearance">
        <Select
          aria-label="Appearance"
          className="w-44"
          value={prefs.appearance}
          onChange={(event) => {
            save({ appearance: appearanceOf(event.target.value) });
          }}
        >
          {APPEARANCES.map((appearance) => (
            <option key={appearance.id} value={appearance.id}>
              {appearance.label}
            </option>
          ))}
        </Select>
      </Row>
      <Row label="Startup">
        <Checkbox
          label="Open ttime at login"
          checked={launchAtLogin ?? false}
          disabled={launchAtLogin === null}
          onChange={saveLaunchAtLogin}
        />
      </Row>
    </Section>
  );
};
