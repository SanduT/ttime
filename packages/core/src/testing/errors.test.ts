import { expect, test } from 'bun:test';

import { TTimeError } from '../lib/errors';
import { errorCodeOf } from './errors';

test('errorCodeOf returns the code, the message of other errors, or null', async () => {
  expect(await errorCodeOf(Promise.reject(new TTimeError('io.failed', 'x')))).toBe('io.failed');
  expect(await errorCodeOf(Promise.reject(new Error('boom')))).toBe('Error: boom');
  expect(await errorCodeOf(Promise.resolve(1))).toBeNull();
});
