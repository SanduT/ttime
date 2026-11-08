import { isTTimeError } from '@ttime/core';

import { useToastStore } from '../store/toast-store';
import { getAppContext } from './app-context';

const UNEXPECTED = 'Something went wrong. Details are in the ttime log file.';

/**
 * Runs a user action. A `TTimeError` shows its message; anything else is logged with its stack
 * and shows a generic message. The only place UI actions catch errors.
 */
export const runAction = async <T>(
  label: string,
  action: () => Promise<T>,
): Promise<T | undefined> => {
  try {
    return await action();
  } catch (error) {
    const { logger } = await getAppContext().catch(() => ({ logger: null }));
    if (isTTimeError(error)) {
      logger?.warn(`${label} failed`, { code: error.code });
      useToastStore.getState().push(error.message);
    } else {
      logger?.error(`${label} failed unexpectedly`, {
        error: error instanceof Error ? (error.stack ?? error.message) : String(error),
      });
      useToastStore.getState().push(UNEXPECTED);
    }
    return undefined;
  }
};
