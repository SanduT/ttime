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

const UNITS = /^(?:(\d+(?:\.\d+)?)h)?(?:(\d+)m)?$/;
const CLOCK = /^(\d+):([0-5]\d)$/;

/**
 * Whole seconds of a duration written as `2h`, `90m`, `1h30m`, `1.5h` or `1:30`; null for
 * anything else or zero. Pure.
 */
export const parseDuration = (text: string): number | null => {
  const value = text.trim().toLowerCase();
  const clock = CLOCK.exec(value);
  const units = clock === null ? UNITS.exec(value) : null;
  let seconds = 0;
  if (clock !== null) {
    seconds = Number(clock[1]) * SECONDS_PER_HOUR + Number(clock[2]) * SECONDS_PER_MINUTE;
  } else if (units !== null && value !== '') {
    seconds = Math.round(
      Number(units[1] ?? '0') * SECONDS_PER_HOUR + Number(units[2] ?? '0') * SECONDS_PER_MINUTE,
    );
  }
  return seconds > 0 ? seconds : null;
};
