import type { Accent, Appearance } from '../../../shared/bridge/settings-api';
import { setAccent } from '../../../shared/lib/accent';
import { Select } from '../../../shared/ui/field';
import type { PrefsState } from '../hooks/use-prefs';
import { Row, Section } from './section';

const APPEARANCES: readonly { readonly id: Appearance; readonly label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

/** Swatch colors per accent: light mode first, dark mode second (tokens.css). */
const ACCENTS: readonly { readonly id: Accent; readonly label: string; readonly color: string }[] =
  [
    { id: 'ember', label: 'Ember', color: 'light-dark(rgb(194 84 26), rgb(255 143 77))' },
    { id: 'jade', label: 'Jade', color: 'light-dark(rgb(11 127 91), rgb(61 214 163))' },
    { id: 'iris', label: 'Iris', color: 'light-dark(rgb(106 85 240), rgb(155 140 255))' },
  ];

const appearanceOf = (value: string): Appearance =>
  APPEARANCES.find((appearance) => appearance.id === value)?.id ?? 'system';

/** One accent choice: a color swatch and its name, ringed when selected. */
const Swatch = ({
  accent,
  selected,
  onPick,
}: {
  readonly accent: (typeof ACCENTS)[number];
  readonly selected: boolean;
  readonly onPick: () => void;
}) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onPick}
    className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-colors ${
      selected
        ? 'border-(--color-accent) bg-(--color-accent-tint)'
        : 'border-(--color-border) hover:bg-(--color-hover)'
    }`}
  >
    <span
      className="size-4 rounded-full shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]"
      style={{ background: accent.color }}
    />
    {accent.label}
  </button>
);

/** Light or dark mode, and the accent color used across every window. */
export const ThemeSection = ({ state }: { readonly state: PrefsState }) => {
  const { prefs, save } = state;
  if (prefs === null) {
    return null;
  }
  return (
    <Section title="Theme">
      <Row label="Appearance">
        <Select
          aria-label="Appearance"
          className="w-44"
          value={prefs.appearance}
          onChange={(event) => {
            save({ appearance: appearanceOf(event.target.value) });
          }}
        >
          {APPEARANCES.map((appearance) => (
            <option key={appearance.id} value={appearance.id}>
              {appearance.label}
            </option>
          ))}
        </Select>
      </Row>
      <Row label="Accent">
        {ACCENTS.map((accent) => (
          <Swatch
            key={accent.id}
            accent={accent}
            selected={prefs.accent === accent.id}
            onPick={() => {
              setAccent(accent.id);
              save({ accent: accent.id });
            }}
          />
        ))}
      </Row>
    </Section>
  );
};
