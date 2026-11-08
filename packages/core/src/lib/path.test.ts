import { expect, test } from 'bun:test';

import { dirName, joinPath } from './path';

test('joinPath joins with single slashes', () => {
  expect(joinPath('/vault/', '/entries', '2026', '')).toBe('/vault/entries/2026');
});

test('dirName returns the parent directory', () => {
  expect(dirName('/vault/entries/a.json')).toBe('/vault/entries');
  expect(dirName('/a.json')).toBe('/');
  expect(dirName('a.json')).toBe('.');
});
