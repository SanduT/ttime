type Props = { readonly color: string };

/** A small dot in a project's color. */
export const ProjectDot = ({ color }: Props) => (
  <span
    aria-hidden
    className="inline-block size-2.5 shrink-0 rounded-full"
    style={{ backgroundColor: color }}
  />
);
