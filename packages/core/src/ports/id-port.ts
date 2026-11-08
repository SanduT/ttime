import { createUlidFactory } from '../lib/ulid';
import type { ClockPort } from './clock-port';

/** Produces new entry and batch IDs (ULIDs). */
export type IdGenerator = {
  readonly newId: () => string;
};

/** Dependencies of {@link createUlidGenerator}. */
export type UlidGeneratorDeps = {
  readonly clock: ClockPort;
  /** Cryptographically random bytes, e.g. `crypto.getRandomValues` in the adapter. */
  readonly randomBytes: (length: number) => Uint8Array;
};

/** Monotonic ULIDs timed by the clock. */
export const createUlidGenerator = ({ clock, randomBytes }: UlidGeneratorDeps): IdGenerator => {
  const next = createUlidFactory({ nowMs: () => clock.now().epochMilliseconds, randomBytes });
  return { newId: next };
};
