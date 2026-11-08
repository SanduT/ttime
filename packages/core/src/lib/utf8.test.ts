import { expect, test } from 'bun:test';

import { utf8Bytes } from './utf8';

test('utf8Bytes matches the standard encoder for 1 to 4 byte characters', () => {
  for (const text of ['abc', 'ăîș', '€ 漢', '🙂 time']) {
    expect([...utf8Bytes(text)]).toEqual([...new TextEncoder().encode(text)]);
  }
});
