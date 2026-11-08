import type { VaultSettings } from '../schema/vault-config';

/** How reports and exports round durations (`ttime.json` `settings.rounding`). */
export type Rounding = Pick<VaultSettings['rounding'], 'mode' | 'minutes' | 'scope'>;

const SECONDS_PER_MINUTE = 60;

/**
 * Rounds `seconds` to the rounding interval: up, down or to the nearest (halves up). Raw times
 * stay untouched in the vault; this is for reports and exports only. Pure.
 */
export const roundSeconds = (
  seconds: number,
  rounding: Pick<Rounding, 'mode' | 'minutes'>,
): number => {
  const step = rounding.minutes * SECONDS_PER_MINUTE;
  switch (rounding.mode) {
    case 'none': {
      return seconds;
    }
    case 'up': {
      return Math.ceil(seconds / step) * step;
    }
    case 'down': {
      return Math.floor(seconds / step) * step;
    }
    case 'nearest': {
      return Math.floor(seconds / step + 0.5) * step;
    }
  }
};
