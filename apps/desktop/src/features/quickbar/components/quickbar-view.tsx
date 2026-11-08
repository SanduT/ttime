import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useVaultStore } from '../../../shared/store/vault-store';
import { usePromptActions } from '../hooks/use-prompt-actions';
import { useQuickContext } from '../hooks/use-quick-context';
import { useQuickbarActions } from '../hooks/use-quickbar-actions';
import { useQuickbarController } from '../hooks/use-quickbar-controller';
import { useQuickbarShown } from '../hooks/use-quickbar-shown';
import { useQuickbarStore } from '../store/quickbar-store';
import { EditRunning } from './edit-running';
import { Footer } from './footer';
import { MonitorPromptView } from './monitor-prompt';
import { QuickbarBody } from './quickbar-body';
import { RunningHeader } from './running-header';

/** The quick bar: running header, input with list (or the edit form), footer. */
export const QuickbarView = () => {
  const { text, panel, noteMode, error, prompt } = useQuickbarStore();
  const { keep } = usePromptActions();
  const projectMap = useVaultStore((state) => state.snapshot?.projects);
  const projects = useMemo(() => projectMap ?? new Map(), [projectMap]);
  const context = useQuickContext();
  const actions = useQuickbarActions();
  const inputRef = useRef<HTMLInputElement>(null);
  const focus = useCallback(() => inputRef.current?.focus(), []);
  useQuickbarShown(focus);
  const { items, value, select, run, onKeyDownCapture } = useQuickbarController(context, focus);
  const { running } = context;

  // Keep the keyboard in the input: after panel changes and whenever the panel becomes key.
  useEffect(() => {
    focus();
  }, [panel, noteMode, focus]);
  useEffect(() => {
    window.addEventListener('focus', focus);
    return () => {
      window.removeEventListener('focus', focus);
    };
  }, [focus]);

  return (
    <div
      role="presentation"
      onKeyDownCapture={(event) => {
        if (panel !== 'prompt') {
          onKeyDownCapture(event);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          keep();
        }
      }}
      className="flex h-screen flex-col overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface)"
    >
      <RunningHeader />
      {panel === 'prompt' && prompt !== null ? (
        <MonitorPromptView prompt={prompt} />
      ) : panel === 'edit' && running !== null ? (
        <EditRunning
          running={running}
          projects={context.projects}
          onSave={(patch) => void actions.editRunning(patch)}
        />
      ) : (
        <QuickbarBody
          items={items}
          value={value}
          projects={projects}
          running={running !== null}
          inputRef={inputRef}
          onSelect={select}
          onRun={run}
        />
      )}
      <Footer
        panel={panel}
        noteMode={noteMode}
        empty={text.trim() === ''}
        hasError={error !== null}
      />
    </div>
  );
};
