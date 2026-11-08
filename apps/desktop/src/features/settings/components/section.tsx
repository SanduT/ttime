import type { ReactNode } from 'react';

/** A titled group of setting rows. */
export const Section = ({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) => (
  <section className="flex flex-col gap-3 border-b border-(--color-border) pb-6">
    <h2 className="pb-1 text-sm font-semibold">{title}</h2>
    {children}
  </section>
);

/** One setting: its label in a fixed left column, its controls on the right, centered. */
export const Row = ({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) => (
  <div className="grid grid-cols-[10rem_minmax(0,1fr)] items-center gap-x-4">
    <span className="text-right text-sm text-(--color-text-muted)">{label}</span>
    <div className="flex min-h-8 min-w-0 items-center gap-2">{children}</div>
  </div>
);
