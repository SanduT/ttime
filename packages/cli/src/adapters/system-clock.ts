import { type ClockPort, Temporal } from '@ttime/core';

/** The real clock, in the system time zone. */
export const createSystemClock = (): ClockPort => ({
  now: () => Temporal.Now.zonedDateTimeISO(),
  sleep: (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    }),
});
