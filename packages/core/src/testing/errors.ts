import { isTTimeError } from '../lib/errors';

/** Awaits `promise` and returns the `TTimeError` code it rejected with, or null if it resolved. */
export const errorCodeOf = async (promise: Promise<unknown>): Promise<string | null> => {
  try {
    await promise;
    return null;
  } catch (error) {
    return isTTimeError(error) ? error.code : String(error);
  }
};
