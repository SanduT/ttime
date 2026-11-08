import { useVaultLoader } from '../../vault';
import { useAgent } from '../hooks/use-agent';
import { useQuickbarActions } from '../hooks/use-quickbar-actions';
import { QuickbarView } from './quickbar-view';

/** Days of entries the quick bar loads for recent items (ARCHITECTURE 7.1). */
const RECENT_DAYS = 60;

const NoVault = () => {
  const actions = useQuickbarActions();
  return (
    <main className="flex h-screen flex-col items-center justify-center gap-2 rounded-xl border border-(--color-border) bg-(--color-surface) p-6 text-sm">
      <p>No vault is open yet.</p>
      <button
        type="button"
        className="text-(--color-accent) hover:underline"
        onClick={() => void actions.openMain()}
      >
        Open ttime to create or choose one
      </button>
    </main>
  );
};

/** The quick bar window's content, and the agent that keeps the menu bar current. */
export const QuickbarRoot = () => {
  const status = useVaultLoader({ days: RECENT_DAYS });
  useAgent();
  if (status === 'loading') {
    return null;
  }
  return status === 'ready' ? <QuickbarView /> : <NoVault />;
};
