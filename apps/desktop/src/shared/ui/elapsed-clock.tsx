import NumberFlow, { NumberFlowGroup } from '@number-flow/react';

const TWO_DIGITS = { minimumIntegerDigits: 2 } as const;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;

/** `h:mm:ss` whose digits roll as they change. */
export const ElapsedClock = ({
  seconds,
  className = '',
}: {
  readonly seconds: number;
  readonly className?: string;
}) => {
  const hours = Math.floor(seconds / SECONDS_PER_HOUR);
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE) % SECONDS_PER_MINUTE;
  const rest = seconds % SECONDS_PER_MINUTE;
  return (
    <span className={`tabular-nums ${className}`}>
      <NumberFlowGroup>
        <NumberFlow value={hours} />
        <NumberFlow value={minutes} format={TWO_DIGITS} prefix=":" />
        <NumberFlow value={rest} format={TWO_DIGITS} prefix=":" />
      </NumberFlowGroup>
    </span>
  );
};
