import { describe, expect, test } from 'bun:test';

import { acceleratorOf, displayOf, type KeyPress } from './accelerator';

const press = (code: string, mods: Partial<KeyPress> = {}): KeyPress => ({
  code,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
});

describe('acceleratorOf', () => {
  test('builds modifiers in macOS order with the physical key', () => {
    expect(acceleratorOf(press('Space', { altKey: true, shiftKey: true }))).toBe('Alt+Shift+Space');
    expect(acceleratorOf(press('KeyK', { metaKey: true, ctrlKey: true }))).toBe('Ctrl+Cmd+K');
    expect(acceleratorOf(press('Digit1', { altKey: true }))).toBe('Alt+1');
  });

  test('waits while only modifiers are down and refuses bare keys except F-keys', () => {
    expect(acceleratorOf(press('ShiftLeft', { shiftKey: true }))).toBeNull();
    expect(acceleratorOf(press('KeyK'))).toBeNull();
    expect(acceleratorOf(press('F5'))).toBe('F5');
  });
});

describe('displayOf', () => {
  test('shows symbols', () => {
    expect(displayOf('Alt+Shift+Space')).toBe('⌥⇧Space');
    expect(displayOf('Ctrl+Cmd+Comma')).toBe('⌃⌘,');
  });
});
