import type { Temporal } from 'temporal-polyfill';

/** Time for core. `sleep` exists because core has no timer globals (only lock retries use it). */
export type ClockPort = {
  /** The current time in the system time zone. */
  readonly now: () => Temporal.ZonedDateTime;
  /** Resolves after `ms` milliseconds. */
  readonly sleep: (ms: number) => Promise<void>;
};
