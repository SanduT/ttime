import type { ReactNode } from 'react';

/** A raised card in the popover. */
export const Card = ({
  label,
  className = '',
  children,
}: {
  readonly label?: string;
  readonly className?: string;
  readonly children: ReactNode;
}) => (
  <section
    aria-label={label}
    className={`relative rounded-[14px] border border-(--color-border) bg-(--color-raised) shadow-(--shadow-card) ${className}`}
  >
    {children}
  </section>
);

/** The small uppercase label at the top of a card. */
export const CardLabel = ({ children }: { readonly children: ReactNode }) => (
  <h2 className="px-2 pt-1.5 pb-1 text-[11px] font-semibold tracking-[0.06em] text-(--color-text-faint) uppercase">
    {children}
  </h2>
);
