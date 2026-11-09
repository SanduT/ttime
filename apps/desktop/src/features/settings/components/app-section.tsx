import type { MenuBarDisplay } from '../../../shared/bridge/settings-api';
import { Checkbox } from '../../../shared/ui/checkbox';
import { Select } from '../../../shared/ui/field';
import type { PrefsState } from '../hooks/use-prefs';
import { MonitorRows } from './monitor-rows';
import { Row, Section } from './section';
import { ShortcutRecorder } from './shortcut-recorder';

const DISPLAYS: readonly { readonly id: MenuBarDisplay; readonly label: string }[] = [
  { id: 'time', label: 'Time' },
  { id: 'project-and-time', label: 'Project and time' },
  { id: 'icon', label: 'Icon only' },
];

const displayOf = (value: string): MenuBarDisplay =>
  DISPLAYS.find((display) => display.id === value)?.id ?? 'time';

/** App preferences: the quick bar shortcut, menu bar, monitors and launch at login. */
export const AppSection = ({ state }: { readonly state: PrefsState }) => {
  const { prefs, save, launchAtLogin, saveLaunchAtLogin } = state;
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
      <MonitorRows prefs={prefs} save={save} />
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
