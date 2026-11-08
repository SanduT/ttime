/** Every quick bar action reachable from the keyboard and the ⌘K panel. */
export type ActionId = 'start' | 'note' | 'stop' | 'edit' | 'open-main' | 'actions' | 'close';

/** An action with its label and shortcut hint. */
export type ActionSpec = { readonly id: ActionId; readonly label: string; readonly hint: string };

/** The ⌘K list, in display order (PRD 6.1). */
export const ACTIONS: readonly ActionSpec[] = [
  { id: 'start', label: 'Start or switch', hint: '↵' },
  { id: 'note', label: 'Add note', hint: '⌘↵' },
  { id: 'stop', label: 'Stop', hint: '⌘.' },
  { id: 'edit', label: 'Edit running entry', hint: '⌘E' },
  { id: 'open-main', label: 'Open ttime', hint: '⌘O' },
  { id: 'actions', label: 'Show actions', hint: '⌘K' },
  { id: 'close', label: 'Close', hint: 'Esc' },
];

/** The parts of a keyboard event the shortcuts look at. */
export type KeyPress = {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
};

const META_KEYS: Readonly<Record<string, ActionId>> = {
  Enter: 'note',
  '.': 'stop',
  e: 'edit',
  o: 'open-main',
  k: 'actions',
};

/** The action a key press triggers, or null. Plain Enter and arrows are left to the list. */
export const actionForKey = (press: KeyPress): ActionId | null => {
  if (press.key === 'Escape') {
    return 'close';
  }
  if (!press.metaKey || press.ctrlKey || press.altKey || press.shiftKey) {
    return null;
  }
  return META_KEYS[press.key] ?? META_KEYS[press.key.toLowerCase()] ?? null;
};

/** What the quick bar is showing, as far as keys care. */
export type KeyState = {
  readonly panel: 'list' | 'actions' | 'edit' | 'done';
  readonly noteMode: boolean;
  /** The input holds only whitespace. */
  readonly empty: boolean;
  /** The highlighted row is a recent entry. */
  readonly onRecent: boolean;
};

/** What a key press means in the quick bar, before the list sees it. */
export type KeyIntent =
  | { readonly kind: 'action'; readonly id: ActionId }
  | { readonly kind: 'close' }
  | { readonly kind: 'fill-recent' };

/**
 * Resolves a key press: shortcuts first (⌘↵ belongs to the edit form there), then Enter on an
 * empty input closes the result and note views, then Tab copies a recent row into the input.
 * Null leaves the key to the list and the input.
 */
export const keyIntent = (press: KeyPress, state: KeyState): KeyIntent | null => {
  const id = actionForKey(press);
  if (id !== null && !(state.panel === 'edit' && id === 'note')) {
    return { kind: 'action', id };
  }
  const plainEnter = press.key === 'Enter' && !press.metaKey && !press.shiftKey;
  if (plainEnter && state.empty && (state.panel === 'done' || state.noteMode)) {
    return { kind: 'close' };
  }
  return press.key === 'Tab' && state.onRecent ? { kind: 'fill-recent' } : null;
};
