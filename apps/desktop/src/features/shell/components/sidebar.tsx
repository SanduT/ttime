import { useVaultStore } from '../../../shared/store/vault-store';
import { useNavStore, type View } from '../store/nav-store';

const ITEMS: readonly { readonly view: View; readonly label: string }[] = [
  { view: 'today', label: 'Today' },
  { view: 'projects', label: 'Projects' },
];

const itemClass = (active: boolean): string =>
  `flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${
    active ? 'bg-(--color-control) font-medium' : 'hover:bg-(--color-control)'
  }`;

/** Today and Projects, Settings at the bottom, plus Issues while the vault has problems (ARCHITECTURE 7.4). */
export const Sidebar = () => {
  const { view, go } = useNavStore();
  const issues = useVaultStore((state) => state.snapshot?.issues.length ?? 0);
  const name = useVaultStore((state) => state.snapshot?.config?.name ?? '');
  const items = issues === 0 ? ITEMS : [...ITEMS, { view: 'issues' as const, label: 'Issues' }];
  return (
    <nav
      aria-label="Views"
      className="flex w-48 shrink-0 flex-col gap-1 border-r border-(--color-border) p-3"
    >
      <p className="truncate px-2 pb-2 text-xs font-semibold text-(--color-text-muted)">{name}</p>
      {items.map((item) => (
        <button
          key={item.view}
          type="button"
          aria-current={view === item.view ? 'page' : undefined}
          className={itemClass(view === item.view)}
          onClick={() => {
            go(item.view);
          }}
        >
          {item.label}
          {item.view === 'issues' ? (
            <span className="rounded-full bg-(--color-danger) px-1.5 text-xs text-white">
              {issues}
            </span>
          ) : null}
        </button>
      ))}
      <span className="flex-1" />
      <button
        type="button"
        aria-current={view === 'settings' ? 'page' : undefined}
        className={itemClass(view === 'settings')}
        onClick={() => {
          go('settings');
        }}
      >
        Settings
        <span className="text-xs text-(--color-text-muted)">⌘,</span>
      </button>
    </nav>
  );
};
