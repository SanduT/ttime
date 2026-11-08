/** A checkbox with its label on the right, as tall as the other controls so rows line up. */
export const Checkbox = ({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  readonly label: string;
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly onChange: (checked: boolean) => void;
}) => (
  <label className={`flex h-8 shrink-0 items-center gap-2 text-sm ${disabled ? 'opacity-50' : ''}`}>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => {
        onChange(event.target.checked);
      }}
    />
    {label}
  </label>
);
