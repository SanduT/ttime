import { formatTimestamp, resolveStart, type Temporal, type Timestamp } from '@ttime/core';

const CLOCK = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/**
 * The timestamp for an `H:MM` or `HH:MM` wall-clock time on `now`'s date, or null when the
 * text is not a valid time. Times later than now are left for the core to reject.
 */
export const timestampAt = (text: string, now: Temporal.ZonedDateTime): Timestamp | null => {
  const match = CLOCK.exec(text.trim());
  if (match === null) {
    return null;
  }
  const spec = { kind: 'clock', hour: Number(match[1]), minute: Number(match[2]) } as const;
  return formatTimestamp(resolveStart(spec, now));
};
