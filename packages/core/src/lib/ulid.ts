/** Crockford base32, as used by ULIDs. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const TIME_CHARS = 10;
const RANDOM_CHARS = 16;
const RANDOM_BYTES = 10;
const BITS_PER_CHAR = 5;
const BASE = 32;

/** ULID pattern: 26 Crockford base32 characters. */
export const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

const encodeTime = (epochMs: number): string => {
  let rest = epochMs;
  let out = '';
  for (let i = 0; i < TIME_CHARS; i += 1) {
    out = (ALPHABET[rest % BASE] ?? '0') + out;
    rest = Math.floor(rest / BASE);
  }
  return out;
};

const encodeRandom = (bytes: Uint8Array): string => {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= BITS_PER_CHAR) {
      bits -= BITS_PER_CHAR;
      out += ALPHABET[(value >>> bits) & (BASE - 1)] ?? '0';
    }
    value &= (1 << bits) - 1;
  }
  return out.slice(0, RANDOM_CHARS);
};

/** Adds one to big-endian random bytes, for monotonic IDs within the same millisecond. */
const increment = (bytes: Uint8Array): Uint8Array => {
  const next = Uint8Array.from(bytes);
  for (let i = next.length - 1; i >= 0; i -= 1) {
    const byte = next[i] ?? 0;
    if (byte < 0xff) {
      next[i] = byte + 1;
      return next;
    }
    next[i] = 0;
  }
  return next;
};

/** Encodes a ULID from a millisecond timestamp and 10 random bytes. */
export const encodeUlid = (epochMs: number, random: Uint8Array): string =>
  encodeTime(epochMs) + encodeRandom(random);

/** The creation time encoded in a ULID, in epoch milliseconds. */
export const ulidTime = (id: string): number => {
  let ms = 0;
  for (const char of id.slice(0, TIME_CHARS)) {
    ms = ms * BASE + ALPHABET.indexOf(char);
  }
  return ms;
};

/** Dependencies of {@link createUlidFactory}. */
export type UlidFactoryDeps = {
  readonly nowMs: () => number;
  readonly randomBytes: (length: number) => Uint8Array;
};

/** Returns a function producing monotonic ULIDs: strictly increasing even within one millisecond. */
export const createUlidFactory = ({ nowMs, randomBytes }: UlidFactoryDeps): (() => string) => {
  let lastMs = -1;
  let lastRandom: Uint8Array = new Uint8Array(RANDOM_BYTES);
  return () => {
    const ms = Math.max(nowMs(), lastMs);
    lastRandom = ms === lastMs ? increment(lastRandom) : randomBytes(RANDOM_BYTES);
    lastMs = ms;
    return encodeUlid(ms, lastRandom);
  };
};
