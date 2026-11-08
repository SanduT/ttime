import type { ButtonHTMLAttributes } from 'react';

const VARIANTS = {
  primary: 'bg-(--color-accent) text-(--color-on-accent) hover:opacity-90',
  secondary: 'bg-(--color-control) text-(--color-text) hover:bg-(--color-border)',
} as const;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { readonly variant?: keyof typeof VARIANTS };

/** A push button. Defaults to `type="button"`. */
export const Button = ({
  variant = 'secondary',
  className = '',
  type = 'button',
  ...rest
}: Props) => (
  <button
    type={type}
    className={`inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md px-3 text-sm font-medium outline-offset-2 focus-visible:outline-2 focus-visible:outline-(--color-accent) disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    {...rest}
  />
);
