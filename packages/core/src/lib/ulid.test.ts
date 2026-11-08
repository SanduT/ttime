import { expect, test } from 'bun:test';

import { createUlidFactory, encodeUlid, ULID_PATTERN, ulidTime } from './ulid';

test('encodes the spec example timestamp and is 26 Crockford characters', () => {
  const id = encodeUlid(1_469_918_176_385, new Uint8Array(10));
  expect(id).toBe('01ARYZ6S410000000000000000');
  expect(ULID_PATTERN.test(id)).toBe(true);
});

test('decodes the creation time back from an ID', () => {
  expect(ulidTime(encodeUlid(1_762_600_000_123, new Uint8Array(10).fill(255)))).toBe(
    1_762_600_000_123,
  );
});

test('IDs created in the same millisecond still increase', () => {
  const next = createUlidFactory({ nowMs: () => 1000, randomBytes: (n) => new Uint8Array(n) });
  const ids = [next(), next(), next()];
  expect([...ids].sort()).toEqual(ids);
  expect(new Set(ids).size).toBe(3);
});

test('a clock moving backwards does not break ordering', () => {
  const times = [2000, 1000];
  const next = createUlidFactory({
    nowMs: () => times.shift() ?? 0,
    randomBytes: (n) => new Uint8Array(n).fill(7),
  });
  const first = next();
  const second = next();
  expect(second > first).toBe(true);
});

test('incrementing carries across bytes', () => {
  const next = createUlidFactory({
    nowMs: () => 5,
    randomBytes: (n) => new Uint8Array(n).fill(255),
  });
  const first = next();
  const second = next();
  expect(second.slice(0, 10)).toBe(first.slice(0, 10));
  expect(second).not.toBe(first);
});
