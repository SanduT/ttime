import { debug, error, info, warn } from '@tauri-apps/plugin-log';
import type { LogContext, Logger } from '@ttime/core';

type LogFn = typeof info;

const toKeyValues = (context: LogContext | undefined): Record<string, string> => {
  const keyValues: Record<string, string> = {};
  if (context === undefined) {
    return keyValues;
  }
  for (const [key, value] of Object.entries(context)) {
    keyValues[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return keyValues;
};

const forward =
  (log: LogFn) =>
  (message: string, context?: LogContext): void => {
    // A failed log write has nowhere to be reported, so the promise is intentionally not awaited.
    void log(message, { keyValues: toKeyValues(context) });
  };

/** Logger for the webviews: writes to the shared tauri-plugin-log file used by Rust too. */
export const createTauriLogger = (): Logger => ({
  debug: forward(debug),
  info: forward(info),
  warn: forward(warn),
  error: forward(error),
});
