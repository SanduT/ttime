import { type ClockPort, createUlidGenerator, type IdGenerator, Temporal } from '@ttime/core';

/** The system clock in the system time zone. */
export const createSystemClock = (): ClockPort => ({
  now: () => Temporal.Now.zonedDateTimeISO(),
  sleep: (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    }),
});

/** Monotonic ULIDs from the Web Crypto random source. */
export const createRandomIds = (clock: ClockPort): IdGenerator =>
  createUlidGenerator({
    clock,
    randomBytes: (length) => crypto.getRandomValues(new Uint8Array(length)),
  });
