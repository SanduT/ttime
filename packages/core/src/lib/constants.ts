/** Current vault schema version. Every vault file carries it. */
export const SCHEMA_VERSION = 1;

/** A start may be at most this far in the future (clock skew between processes). */
export const MAX_FUTURE_START_SECONDS = 60;

/** Lock owners refresh `owner.json` at least this often while working. */
export const LOCK_REFRESH_MS = 2000;

/** A lock not refreshed for this long is stale and may be broken. */
export const LOCK_STALE_MS = 10_000;

/** Pause between attempts to acquire a held lock. */
export const LOCK_RETRY_MS = 25;

/** Give up acquiring the lock after this long. */
export const LOCK_TIMEOUT_MS = 15_000;

/** Milliseconds per second. */
export const MS_PER_SECOND = 1000;
