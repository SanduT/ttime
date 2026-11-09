import { Keycaps } from '../../../shared/ui/keycap';
import type { QuickbarPanel } from '../store/quickbar-store';

type Props = {
  readonly panel: QuickbarPanel;
  readonly noteMode: boolean;
  readonly empty: boolean;
  readonly hasError: boolean;
};

/** Splits `⌘↵` into `⌘` and `↵`; named keys like `Esc` and `Tab` stay whole. */
const keysOf = (keys: string): readonly string[] =>
  keys.length > 1 && keys.startsWith('⌘') ? ['⌘', keys.slice(1)] : [keys];

const Hint = ({ keys, label }: { readonly keys: string; readonly label: string }) => (
  <span className="flex items-center gap-1.5">
    {label}
    <Keycaps keys={keysOf(keys)} />
  </span>
);

const enterLabel = (panel: QuickbarPanel, noteMode: boolean, empty: boolean): string => {
  if (panel === 'edit') {
    return 'Save';
  }
  if (empty && (panel === 'done' || noteMode)) {
    return 'Close';
  }
  return noteMode ? 'Add note' : 'Select';
};

const escLabel = (panel: QuickbarPanel, hasError: boolean): string =>
  hasError ? 'Dismiss' : panel === 'edit' || panel === 'actions' ? 'Back' : 'Close';

/** Shortcut hints for the current panel. */
export const Footer = ({ panel, noteMode, empty, hasError }: Props) =>
  panel === 'prompt' ? (
    <footer className="flex h-11 items-center gap-4 border-t border-(--color-border) bg-(--color-hover) px-4 text-xs text-(--color-text-muted)">
      <Hint keys="↵" label="Choose" />
      <Hint keys="Tab" label="Next" />
      <span className="flex-1" />
      <Hint keys="Esc" label="Keep all" />
    </footer>
  ) : (
    <footer className="flex h-11 items-center gap-4 border-t border-(--color-border) bg-(--color-hover) px-4 text-xs text-(--color-text-muted)">
      <Hint keys="↵" label={enterLabel(panel, noteMode, empty)} />
      {panel === 'edit' || noteMode ? null : <Hint keys="⌘↵" label="Note" />}
      <span className="flex-1" />
      <Hint keys="⌘K" label="Actions" />
      <Hint keys="Esc" label={escLabel(panel, hasError)} />
    </footer>
  );
