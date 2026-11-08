import { errorCodeOf, TTimeError } from '@ttime/core';
import { expect, test } from 'bun:test';

import { toTTimeError, unwrap } from './ipc';

test('ok results resolve to their data', async () => {
  expect(await unwrap(Promise.resolve({ status: 'ok', data: 42 }))).toBe(42);
});

test('Rust errors become TTimeErrors with matching codes', async () => {
  const error = { code: 'io.path_not_allowed', message: 'path is not allowed: /etc' };
  expect(await errorCodeOf(unwrap(Promise.resolve({ status: 'error', error })))).toBe(
    'io.path_not_allowed',
  );
  expect(toTTimeError({ code: 'io.failed', message: 'x' }).code).toBe('io.failed');
  expect(toTTimeError({ code: 'input.invalid', message: 'x' }).code).toBe('input.invalid');
});

test('Rust codes without a TypeScript twin become platform.failed and keep the original', () => {
  const error = toTTimeError({ code: 'platform.watcher', message: 'watcher failed' });
  expect(error).toBeInstanceOf(TTimeError);
  expect(error).toMatchObject({
    code: 'platform.failed',
    message: 'watcher failed',
    details: { rustCode: 'platform.watcher' },
  });
});
