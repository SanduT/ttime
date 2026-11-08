import { expect, test } from 'bun:test';

import { isTTimeError, TTimeError } from './errors';

test('TTimeError carries a code, details and cause', () => {
  const cause = new Error('disk');
  const error = new TTimeError('io.failed', 'Could not write', { details: { path: 'x' }, cause });
  expect(error.code).toBe('io.failed');
  expect(error.details).toEqual({ path: 'x' });
  expect(error.cause).toBe(cause);
  expect(isTTimeError(error)).toBe(true);
  expect(isTTimeError(error, 'vault.locked')).toBe(false);
  expect(new TTimeError('input.invalid', 'x').details).toEqual({});
});
