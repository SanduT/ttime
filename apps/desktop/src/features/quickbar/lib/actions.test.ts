import { describe, expect, test } from 'bun:test';

import { actionForKey, keyIntent, type KeyPress, type KeyState } from './actions';

const press = (key: string, modifiers: Partial<KeyPress> = {}): KeyPress => ({
  key,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...modifiers,
});

describe('actionForKey', () => {
  test('maps the ⌘ shortcuts from PRD 6.1', () => {
    expect(actionForKey(press('Enter', { metaKey: true }))).toBe('note');
    expect(actionForKey(press('.', { metaKey: true }))).toBe('stop');
    expect(actionForKey(press('E', { metaKey: true }))).toBe('edit');
    expect(actionForKey(press('o', { metaKey: true }))).toBe('open-main');
    expect(actionForKey(press('k', { metaKey: true }))).toBe('actions');
  });

  test('maps Escape to close', () => {
    expect(actionForKey(press('Escape'))).toBe('close');
  });

  test('ignores plain keys and other modifier combinations', () => {
    expect(actionForKey(press('Enter'))).toBeNull();
    expect(actionForKey(press('p'))).toBeNull();
    expect(actionForKey(press('p', { metaKey: true, shiftKey: true }))).toBeNull();
    expect(actionForKey(press('x', { metaKey: true }))).toBeNull();
  });
});

describe('keyIntent', () => {
  const state: KeyState = { panel: 'list', noteMode: false, empty: false, onRecent: false };

  test('runs shortcuts, except ⌘↵ in the edit form', () => {
    expect(keyIntent(press('.', { metaKey: true }), state)).toEqual({ kind: 'action', id: 'stop' });
    expect(keyIntent(press('Enter', { metaKey: true }), { ...state, panel: 'edit' })).toBeNull();
  });

  test('closes the result and note views on Enter with an empty input', () => {
    expect(keyIntent(press('Enter'), { ...state, panel: 'done', empty: true })).toEqual({
      kind: 'close',
    });
    expect(keyIntent(press('Enter'), { ...state, noteMode: true, empty: true })).toEqual({
      kind: 'close',
    });
    expect(keyIntent(press('Enter'), { ...state, empty: true })).toBeNull();
    expect(keyIntent(press('Enter'), { ...state, panel: 'done' })).toBeNull();
  });

  test('fills the input from a highlighted recent row on Tab', () => {
    expect(keyIntent(press('Tab'), { ...state, onRecent: true })).toEqual({ kind: 'fill-recent' });
    expect(keyIntent(press('Tab'), state)).toBeNull();
  });
});
