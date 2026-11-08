import { isTTimeError, type Logger } from '@ttime/core';

import { writeErr } from './output';

/** Exit codes (CONVENTIONS 7): 1 user error, 2 vault problem, 70 internal error. */
export const EXIT = { ok: 0, user: 1, vault: 2, internal: 70 } as const;

const VAULT_PREFIXES = ['vault.', 'config.', 'io.'];

/** Prints `error` for a person and returns the exit code. The CLI's only catch site. */
export const handleError = (error: unknown, logger: Logger): number => {
  if (isTTimeError(error)) {
    writeErr(`ttime: ${error.message}`);
    return VAULT_PREFIXES.some((prefix) => error.code.startsWith(prefix)) ? EXIT.vault : EXIT.user;
  }
  logger.error('Unexpected error', {
    error: error instanceof Error ? (error.stack ?? error.message) : String(error),
  });
  writeErr('ttime: Something went wrong. Run with TTIME_LOG=debug for details.');
  return EXIT.internal;
};
