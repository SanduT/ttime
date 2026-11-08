import type { ReactNode } from 'react';

/** A titled panel around a chart or table. */
export const ChartCard = ({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) => (
  <section className="flex flex-col gap-3 rounded-lg border border-(--color-border) p-4">
    <h2 className="text-sm font-semibold">{title}</h2>
    {children}
  </section>
);
