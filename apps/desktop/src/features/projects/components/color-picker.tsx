import { PROJECT_COLORS } from '@ttime/core';

type Props = { readonly value: string; readonly onChange: (color: string) => void };

/** The project color swatches. */
export const ColorPicker = ({ value, onChange }: Props) => (
  <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-2">
    {PROJECT_COLORS.map((color) => (
      <button
        key={color}
        type="button"
        role="radio"
        aria-checked={value === color}
        aria-label={color}
        className={`size-6 rounded-full outline-offset-2 ${value === color ? 'outline-2 outline-(--color-text)' : ''}`}
        style={{ backgroundColor: color }}
        onClick={() => {
          onChange(color);
        }}
      />
    ))}
  </div>
);
