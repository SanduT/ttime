import { debug, error, info, warn } from '@tauri-apps/plugin-log';
import type { LogContext, Logger } from '@ttime/core';

type LogFn = typeof info;

/** `key=value` pairs; the log file format prints only the message, so they go in its text. */
const detailsOf = (context: LogContext | undefined): string =>
  Object.entries(context ?? {})
    .map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join(' ');

const forward =
  (log: LogFn) =>
  (message: string, context?: LogContext): void => {
    const details = detailsOf(context);
    // A failed log write has nowhere to be reported, so the promise is intentionally not awaited.
    void log(details === '' ? message : `${message} ${details}`);
  };

/** Logger for the webviews: writes to the shared tauri-plugin-log file used by Rust too. */
export const createLogger = (): Logger => ({
  debug: forward(debug),
  info: forward(info),
  warn: forward(warn),
  error: forward(error),
});
