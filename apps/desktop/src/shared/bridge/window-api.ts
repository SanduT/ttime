import { commands, events, type QuickbarMode, type RunningSummary } from './bindings';
import { unwrap } from './ipc';

export type { QuickbarMode, RunningSummary };

/** Window commands and the running summary for the menu bar. */
export type WindowApi = {
  readonly showQuickbar: (mode: QuickbarMode) => Promise<null>;
  readonly hideQuickbar: () => Promise<null>;
  readonly showMain: () => Promise<null>;
  /** The agent reports the running entry (or null) after every running-state change. */
  readonly setRunning: (summary: RunningSummary | null) => Promise<null>;
  /** Calls `onShown` each time Rust shows the quick bar. Returns unlisten. */
  readonly onQuickbarShown: (onShown: (mode: QuickbarMode) => void) => Promise<() => void>;
};

export const windowApi: WindowApi = {
  showQuickbar: (mode) => unwrap(commands.quickbarShow(mode)),
  hideQuickbar: () => unwrap(commands.quickbarHide()),
  showMain: () => unwrap(commands.mainWindowShow()),
  setRunning: (summary) => unwrap(commands.setRunning(summary)),
  onQuickbarShown: (onShown) =>
    events.quickbarShown.listen((event) => {
      onShown(event.payload.mode);
    }),
};
