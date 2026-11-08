import { SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from './constants';

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * Formats elapsed seconds as `h:mm`, or `h:mm:ss` with `seconds`. Hours are not capped.
 * Negative input shows as zero; fractions are dropped.
 */
export const formatElapsed = (
  totalSeconds: number,
  options: { readonly seconds?: boolean } = {},
): string => {
  const whole = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(whole / SECONDS_PER_HOUR);
  const minutes = Math.floor((whole % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const base = `${String(hours)}:${pad(minutes)}`;
  return options.seconds === true ? `${base}:${pad(whole % SECONDS_PER_MINUTE)}` : base;
};
