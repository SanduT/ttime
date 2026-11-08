import { isTTimeError, type TTimeError } from '@ttime/core';

import { useToastStore } from '../store/toast-store';
import { getAppContext } from './app-context';

const UNEXPECTED = 'Something went wrong. Details are in the ttime log file.';

/** Options for {@link runAction}. */
export type RunActionOptions = {
  /** Shows the failure in place instead of as a toast. `error` is null for unexpected errors. */
  readonly onError?: (message: string, error: TTimeError | null) => void;
};

/**
 * Runs a user action. A `TTimeError` shows its message; anything else is logged with its stack
 * and shows a generic message. The only place UI actions catch errors.
 */
export const runAction = async <T>(
  label: string,
  action: () => Promise<T>,
  options: RunActionOptions = {},
): Promise<T | undefined> => {
  const show =
    options.onError ??
    ((message: string) => {
      useToastStore.getState().push(message);
    });
  try {
    return await action();
  } catch (error) {
    const { logger } = await getAppContext().catch(() => ({ logger: null }));
    if (isTTimeError(error)) {
      logger?.warn(`${label} failed`, { code: error.code });
      show(error.message, error);
    } else {
      logger?.error(`${label} failed unexpectedly`, {
        error: error instanceof Error ? (error.stack ?? error.message) : String(error),
      });
      show(UNEXPECTED, null);
    }
    return undefined;
  }
};
