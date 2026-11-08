import {
  commands,
  events,
  type QuickbarMode,
  type RunningSummary,
  type TrayActionKind,
} from './bindings';
import { unwrap } from './ipc';

export type { QuickbarMode, RunningSummary, TrayActionKind };

/** Window commands and the running summary for the menu bar. */
export type WindowApi = {
  readonly showQuickbar: (mode: QuickbarMode) => Promise<null>;
  readonly hideQuickbar: () => Promise<null>;
  readonly showMain: () => Promise<null>;
  readonly hidePopover: () => Promise<null>;
  readonly quit: () => Promise<null>;
  /** The agent reports the running entry (or null) after every running-state change. */
  /** Updates the menu bar: the running entry, and the label of what Resume continues. */
  readonly setRunning: (summary: RunningSummary | null, resume: string | null) => Promise<null>;
  /** Calls `onShown` each time Rust shows the quick bar. Returns unlisten. */
  readonly onQuickbarShown: (onShown: (mode: QuickbarMode) => void) => Promise<() => void>;
  /** Calls `onAction` for Stop or Resume chosen in the tray menu. Returns unlisten. */
  readonly onTrayAction: (onAction: (action: TrayActionKind) => void) => Promise<() => void>;
};

export const windowApi: WindowApi = {
  showQuickbar: (mode) => unwrap(commands.quickbarShow(mode)),
  hideQuickbar: () => unwrap(commands.quickbarHide()),
  showMain: () => unwrap(commands.mainWindowShow()),
  hidePopover: () => unwrap(commands.popoverHide()),
  quit: () => unwrap(commands.appQuit()),
  setRunning: (summary, resume) => unwrap(commands.setRunning(summary, resume)),
  onQuickbarShown: (onShown) =>
    events.quickbarShown.listen((event) => {
      onShown(event.payload.mode);
    }),
  onTrayAction: (onAction) =>
    events.trayAction.listen((event) => {
      onAction(event.payload.action);
    }),
};
