import { expect, test } from 'bun:test';

import { type Change, changeSchema } from './changelog';

test('a changelog line records actor, op, kind, batch and before and after', () => {
  const line: Change = {
    actor: 'mcp',
    op: 'create',
    kind: 'entry',
    id: '01JC9A2B3C4D5E6F7G8H9J0K1M',
    at: '2026-11-08T12:01:03+02:00',
    batch: '01JC9B2B3C4D5E6F7G8H9J0K1M',
    before: null,
    after: { project: 'acme' },
  };
  expect(changeSchema.parse(line)).toEqual(line);
  expect(changeSchema.safeParse({ ...line, op: 'erase' }).success).toBe(false);
});
