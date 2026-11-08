/** The parts of a key event a shortcut is made of. */
export type KeyPress = {
  readonly code: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
};

/** Physical keys (KeyboardEvent.code) the global shortcut plugin understands as-is. */
const NAMED_KEYS = new Set([
  'Space',
  'Enter',
  'Tab',
  'Backspace',
  'Delete',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Comma',
  'Period',
  'Slash',
  'Semicolon',
  'Quote',
  'BracketLeft',
  'BracketRight',
  'Backslash',
  'Minus',
  'Equal',
  'Backquote',
]);

const FUNCTION_KEY = /^F\d{1,2}$/;

const keyOf = (code: string): string | null => {
  if (/^Key[A-Z]$/.test(code)) {
    return code.slice(3);
  }
  if (/^Digit\d$/.test(code)) {
    return code.slice(5);
  }
  return NAMED_KEYS.has(code) || FUNCTION_KEY.test(code) ? code : null;
};

/**
 * The accelerator for a key press, like `Alt+Shift+Space`, or null while only modifiers are
 * down. Needs a modifier, except for function keys, so typing never triggers it.
 */
export const acceleratorOf = (press: KeyPress): string | null => {
  const key = keyOf(press.code);
  if (key === null) {
    return null;
  }
  const modifiers = [
    press.ctrlKey ? 'Ctrl' : null,
    press.altKey ? 'Alt' : null,
    press.shiftKey ? 'Shift' : null,
    press.metaKey ? 'Cmd' : null,
  ].filter((modifier) => modifier !== null);
  if (modifiers.length === 0 && !FUNCTION_KEY.test(key)) {
    return null;
  }
  return [...modifiers, key].join('+');
};

const SYMBOLS: Readonly<Record<string, string>> = {
  Ctrl: '⌃',
  Control: '⌃',
  Alt: '⌥',
  Option: '⌥',
  Shift: '⇧',
  Cmd: '⌘',
  Command: '⌘',
  Super: '⌘',
  CommandOrControl: '⌘',
  CmdOrCtrl: '⌘',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Enter: '↩',
  Tab: '⇥',
  Backspace: '⌫',
  Delete: '⌦',
  Comma: ',',
  Period: '.',
  Slash: '/',
  Semicolon: ';',
  Quote: "'",
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Minus: '-',
  Equal: '=',
  Backquote: '`',
};

/** `Alt+Shift+Space` as `⌥⇧Space`. */
export const displayOf = (accelerator: string): string =>
  accelerator
    .split('+')
    .map((part) => SYMBOLS[part] ?? part)
    .join('');
