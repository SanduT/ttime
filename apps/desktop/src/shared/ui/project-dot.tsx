type Props = {
  readonly color: string;
  /** A running entry's dot breathes slowly. */
  readonly running?: boolean;
};

/** A small dot in a project's color. */
export const ProjectDot = ({ color, running = false }: Props) => (
  <span
    aria-hidden
    className={`inline-block size-2.5 shrink-0 rounded-full ${running ? 'animate-breathe' : ''}`}
    style={{
      backgroundColor: color,
      boxShadow: running ? `0 0 0 3px color-mix(in srgb, ${color} 22%, transparent)` : undefined,
    }}
  />
);
