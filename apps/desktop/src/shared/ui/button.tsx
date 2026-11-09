import type { ButtonHTMLAttributes } from 'react';

const VARIANTS = {
  primary:
    'bg-(--color-accent) text-(--color-on-accent) font-semibold shadow-[inset_0_1px_0_rgb(255_255_255/0.22)] hover:brightness-108',
  secondary:
    'border border-(--color-border-strong) bg-transparent text-(--color-text) hover:bg-(--color-hover)',
  ghost:
    'bg-transparent text-(--color-text-muted) hover:bg-(--color-hover) hover:text-(--color-text)',
} as const;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { readonly variant?: keyof typeof VARIANTS };

/** A push button. Defaults to `type="button"`. Presses in slightly. */
export const Button = ({
  variant = 'secondary',
  className = '',
  type = 'button',
  ...rest
}: Props) => (
  <button
    type={type}
    className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[9px] px-3 text-sm font-medium transition-[transform,filter,background-color] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    {...rest}
  />
);
