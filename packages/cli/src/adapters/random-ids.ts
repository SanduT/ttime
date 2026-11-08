import { randomBytes } from 'node:crypto';

import { type ClockPort, createUlidGenerator, type IdGenerator } from '@ttime/core';

/** ULIDs with cryptographically random bytes. */
export const createRandomIds = (clock: ClockPort): IdGenerator =>
  createUlidGenerator({ clock, randomBytes: (length) => new Uint8Array(randomBytes(length)) });
