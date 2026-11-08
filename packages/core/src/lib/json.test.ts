import { expect, test } from 'bun:test';

import { isTTimeError } from './errors';
import { parseJson, stringifyLine, stringifyStable, tryParseJson } from './json';

test('tryParseJson returns the value as unknown or the parser message', () => {
  expect(tryParseJson('{"a":1}')).toEqual({ ok: true, value: { a: 1 } });
  const broken = tryParseJson('{"a":');
  expect(broken.ok).toBe(false);
});

test('parseJson throws input.invalid on broken JSON', () => {
  expect(parseJson('[1]')).toEqual([1]);
  try {
    parseJson('nope');
    expect.unreachable();
  } catch (error) {
    expect(isTTimeError(error, 'input.invalid')).toBe(true);
  }
});

test('stringifyStable sorts keys at every level, indents by 2 and ends with a newline', () => {
  const text = stringifyStable({ b: 1, a: { d: [{ z: 1, y: 2 }], c: null }, skip: undefined });
  expect(text).toBe(
    '{\n  "a": {\n    "c": null,\n    "d": [\n      {\n        "y": 2,\n        "z": 1\n      }\n    ]\n  },\n  "b": 1\n}\n',
  );
});

test('stringifyLine is one line with sorted keys', () => {
  expect(stringifyLine({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
});
