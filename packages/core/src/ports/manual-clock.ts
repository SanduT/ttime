import { Temporal } from 'temporal-polyfill';

import type { ClockPort } from './clock-port';

/** A clock that only moves when told to. `sleep` advances it instantly. */
export type ManualClock = ClockPort & {
  /** Moves the clock forward. */
  readonly advance: (duration: Temporal.DurationLike) => void;
  /** Jumps to a given time, e.g. `2026-11-08T09:00:00[Europe/Bucharest]`. */
  readonly set: (time: string) => void;
};

/** Creates a manual clock starting at `start` (an ISO string with a bracketed time zone). */
export const createManualClock = (start: string): ManualClock => {
  let current = Temporal.ZonedDateTime.from(start);
  return {
    now: () => current,
    sleep: (ms) => {
      current = current.add({ milliseconds: ms });
      return Promise.resolve();
    },
    advance: (duration) => {
      current = current.add(duration);
    },
    set: (time) => {
      current = Temporal.ZonedDateTime.from(time);
    },
  };
};
