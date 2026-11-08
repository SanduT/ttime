import { describe, expect, test } from 'bun:test';

import { jsonProblemLine } from './json-locate';

const DAY = `{
  "date": "2026-11-08",
  "entries": [
    {
      "id": "a",
      "start": "x\\"y"
    },
    {
      "id": "b",
      "tags": [1, true, null]
    }
  ]
}
`;

describe('jsonProblemLine', () => {
  test('finds the line of a value by path', () => {
    expect(jsonProblemLine(DAY, ['entries', 0, 'start'])).toBe(6);
    expect(jsonProblemLine(DAY, ['entries', 1, 'tags', 2])).toBe(10);
  });

  test('falls back to the parent for a missing key', () => {
    expect(jsonProblemLine(DAY, ['entries', 1, 'end'])).toBe(8);
  });

  test('is the first line for the root or an empty path', () => {
    expect(jsonProblemLine(DAY)).toBe(1);
  });

  test('points at the first syntax error', () => {
    expect(jsonProblemLine('{\n  "a": 1,\n  oops\n}')).toBe(3);
    expect(jsonProblemLine('{\n  "a": [1 2]\n}')).toBe(2);
    expect(jsonProblemLine('{\n  "a": "open\n}')).toBe(2);
    expect(jsonProblemLine('{}\n\nextra')).toBe(3);
    expect(jsonProblemLine('{"a": 1 "b": 2}')).toBe(1);
  });

  test('handles empty containers', () => {
    expect(jsonProblemLine('{\n  "a": [],\n  "b": {}\n}', ['b'])).toBe(3);
  });
});
