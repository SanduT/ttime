import { expect, test } from 'bun:test';

import { SLUG_PATTERN, slugify, uniqueSlug } from './slug';

test('slugify lowercases, drops diacritics and joins words with hyphens', () => {
  expect(slugify('Acme GmbH')).toBe('acme-gmbh');
  expect(slugify('  Ștefan & Co. Website!  ')).toBe('stefan-co-website');
  expect(SLUG_PATTERN.test(slugify('Über -- Café'))).toBe(true);
});

test('slugify falls back when nothing usable is left', () => {
  expect(slugify('???')).toBe('item');
});

test('uniqueSlug adds a numeric suffix on collision', () => {
  expect(uniqueSlug('Acme', new Set())).toBe('acme');
  expect(uniqueSlug('Acme', new Set(['acme']))).toBe('acme-2');
  expect(uniqueSlug('Acme', new Set(['acme', 'acme-2']))).toBe('acme-3');
});
