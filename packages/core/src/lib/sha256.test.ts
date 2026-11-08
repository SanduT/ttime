import { expect, test } from 'bun:test';

import { sha256Hex } from './sha256';

test('sha256 matches the FIPS 180-4 test vectors', () => {
  expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
    '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
  );
});

test('sha256 encodes non-ASCII text as UTF-8', () => {
  expect(sha256Hex('ăîș timp')).toBe(
    'c039029c388e91e9692a626090d50819ce19889514cb7657b94572edf347d64c',
  );
});

test('sha256 handles input longer than one block', () => {
  expect(sha256Hex('a'.repeat(1000))).toBe(
    '41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3',
  );
});
