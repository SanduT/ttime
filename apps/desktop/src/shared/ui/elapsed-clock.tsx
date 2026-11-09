const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

/**
 * One digit that rolls to its value: a 0 to 9 strip moved by a transform (styled in
 * tokens.css, so it works under the production CSP, which blocks injected style elements).
 */
const Digit = ({ value }: { readonly value: number }) => (
  <span className="roll-digit" aria-hidden>
    <span className="roll-strip" style={{ transform: `translateY(${String(-value * 10)}%)` }}>
      {DIGITS.map((digit) => (
        <span key={digit}>{digit}</span>
      ))}
    </span>
  </span>
);

type Place = { readonly place: string; readonly value: number };

/** Digits of `value` (at least `width`), each named by its place from the right. */
const digitsOf = (group: string, value: number, width: number): readonly Place[] => {
  const places: Place[] = [];
  let rest = value;
  for (let index = 0; index < width || rest > 0; index += 1) {
    places.unshift({ place: `${group}${String(index)}`, value: rest % 10 });
    rest = Math.floor(rest / 10);
  }
  return places;
};

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
  const groups = [
    { name: 'h', digits: digitsOf('h', hours, 1) },
    { name: 'm', digits: digitsOf('m', minutes, 2) },
    { name: 's', digits: digitsOf('s', rest, 2) },
  ];
  const label = `${String(hours)}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  return (
    <span className={`inline-flex tabular-nums ${className}`} role="timer" aria-label={label}>
      {groups.map(({ name, digits }) => (
        // Digits are keyed by place from the right, so a new leading hour digit does not
        // restart the others.
        <span key={name} className="inline-flex">
          {name === 'h' ? null : <span aria-hidden>:</span>}
          {digits.map((digit) => (
            <Digit key={digit.place} value={digit.value} />
          ))}
        </span>
      ))}
    </span>
  );
};
