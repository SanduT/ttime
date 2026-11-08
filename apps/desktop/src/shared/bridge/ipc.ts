import { type ErrorCode, TTimeError } from '@ttime/core';

import type { AppError } from './bindings';

/** What every generated command that can fail resolves to. */
export type IpcResult<T> =
  | { readonly status: 'ok'; readonly data: T }
  | { readonly status: 'error'; readonly error: AppError };

/** Rust codes that have a TypeScript twin. Everything else becomes `platform.failed`. */
const KNOWN_CODES: Readonly<Record<string, ErrorCode>> = {
  'io.failed': 'io.failed',
  'io.path_not_allowed': 'io.path_not_allowed',
  'input.invalid': 'input.invalid',
};

/** The one place a Rust `AppError` becomes a `TTimeError`. */
export const toTTimeError = (error: AppError): TTimeError =>
  new TTimeError(KNOWN_CODES[error.code] ?? 'platform.failed', error.message, {
    details: { rustCode: error.code },
  });

/** Resolves to the command's data or throws its error as a `TTimeError`. */
export const unwrap = async <T>(call: Promise<IpcResult<T>>): Promise<T> => {
  const result = await call;
  if (result.status === 'error') {
    throw toTTimeError(result.error);
  }
  return result.data;
};
