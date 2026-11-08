import type { Logger } from '@ttime/core';

import { writeErr } from './output';

const LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type Level = (typeof LEVELS)[number];

const levelOf = (value: string | undefined): Level =>
  LEVELS.find((level) => level === value?.toLowerCase()) ?? 'warn';

/** JSON lines on stderr at `level` and above (`TTIME_LOG`, default `warn`). */
export const createCliLogger = (level: string | undefined): Logger => {
  const min = LEVELS.indexOf(levelOf(level));
  const log =
    (at: Level) =>
    (message: string, context: Readonly<Record<string, unknown>> = {}): void => {
      if (LEVELS.indexOf(at) >= min) {
        writeErr(JSON.stringify({ level: at, message, ...context }));
      }
    };
  return { debug: log('debug'), info: log('info'), warn: log('warn'), error: log('error') };
};
