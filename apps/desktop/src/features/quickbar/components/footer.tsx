import type { QuickbarPanel } from '../store/quickbar-store';

type Props = {
  readonly panel: QuickbarPanel;
  readonly noteMode: boolean;
  readonly empty: boolean;
  readonly hasError: boolean;
};

const Hint = ({ keys, label }: { readonly keys: string; readonly label: string }) => (
  <span className="flex items-center gap-1">
    <kbd className="rounded bg-(--color-control) px-1.5 py-0.5 font-sans">{keys}</kbd>
    {label}
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
    <footer className="flex items-center gap-4 border-t border-(--color-border) px-4 py-2 text-xs text-(--color-text-muted)">
      <Hint keys="↵" label="Choose" />
      <Hint keys="Tab" label="Next" />
      <span className="flex-1" />
      <Hint keys="Esc" label="Keep all" />
    </footer>
  ) : (
    <footer className="flex items-center gap-4 border-t border-(--color-border) px-4 py-2 text-xs text-(--color-text-muted)">
      <Hint keys="↵" label={enterLabel(panel, noteMode, empty)} />
      {panel === 'edit' || noteMode ? null : <Hint keys="⌘↵" label="Note" />}
      <span className="flex-1" />
      <Hint keys="⌘K" label="Actions" />
      <Hint keys="Esc" label={escLabel(panel, hasError)} />
    </footer>
  );
