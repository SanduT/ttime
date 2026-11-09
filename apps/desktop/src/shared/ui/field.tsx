import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

const CONTROL =
  'h-8 rounded-lg border border-(--color-border) bg-(--color-control) px-2.5 text-sm outline-none transition-[border-color,box-shadow] duration-150 focus:border-(--color-accent) focus:shadow-[0_0_0_3px_var(--color-accent-tint)]';

/** A text input styled like the rest of the app. */
export const TextInput = ({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) => (
  <input type="text" className={`${CONTROL} ${className}`} {...rest} />
);

/** A native select styled like the rest of the app. */
export const Select = ({ className = '', ...rest }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={`${CONTROL} ${className}`} {...rest} />
);

/** A label above a control. */
export const Field = ({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) => (
  <label className="flex flex-col gap-1 text-xs text-(--color-text-muted)">
    {label}
    {children}
  </label>
);
