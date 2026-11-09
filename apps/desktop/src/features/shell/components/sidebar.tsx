import {
  CalendarDays,
  ChartColumn,
  FolderClosed,
  type LucideIcon,
  Settings,
  Sun,
  TriangleAlert,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { useVaultStore } from '../../../shared/store/vault-store';
import { useNavStore, type View } from '../store/nav-store';
import { SidebarRunning } from './sidebar-running';

type Item = { readonly view: View; readonly label: string; readonly icon: LucideIcon };

const ITEMS: readonly Item[] = [
  { view: 'today', label: 'Today', icon: Sun },
  { view: 'calendar', label: 'Calendar', icon: CalendarDays },
  { view: 'projects', label: 'Projects', icon: FolderClosed },
  { view: 'analytics', label: 'Analytics', icon: ChartColumn },
];

const ISSUES: Item = { view: 'issues', label: 'Issues', icon: TriangleAlert };

const itemClass = (active: boolean): string =>
  `flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] transition-colors ${
    active
      ? 'bg-(--color-accent-tint) font-semibold text-(--color-text)'
      : 'font-medium text-(--color-text-muted) hover:bg-(--color-hover) hover:text-(--color-text)'
  }`;

const NavButton = ({
  item,
  active,
  onGo,
  trailing,
}: {
  readonly item: Item;
  readonly active: boolean;
  readonly onGo: () => void;
  readonly trailing?: ReactNode;
}) => (
  <button
    type="button"
    aria-current={active ? 'page' : undefined}
    className={itemClass(active)}
    onClick={onGo}
  >
    <item.icon size={16} className={active ? 'text-(--color-accent)' : ''} aria-hidden />
    <span className="flex-1">{item.label}</span>
    {trailing}
  </button>
);

/** Views with icons, the running entry and Settings at the bottom, plus Issues while the vault has problems (ARCHITECTURE 7.4). */
export const Sidebar = () => {
  const { view, go } = useNavStore();
  const issues = useVaultStore((state) => state.snapshot?.issues.length ?? 0);
  const name = useVaultStore((state) => state.snapshot?.config?.name ?? '');
  const items = issues === 0 ? ITEMS : [...ITEMS, ISSUES];
  return (
    <nav
      aria-label="Views"
      className="flex w-56 shrink-0 flex-col gap-0.5 border-r border-(--color-border) bg-(--color-hover) p-3"
    >
      <p className="truncate px-2.5 pb-3 text-xs font-semibold text-(--color-text-faint)">{name}</p>
      {items.map((item) => (
        <NavButton
          key={item.view}
          item={item}
          active={view === item.view}
          onGo={() => {
            go(item.view);
          }}
          trailing={
            item.view === 'issues' ? (
              <span className="rounded-full bg-(--color-danger) px-1.5 text-xs text-white">
                {issues}
              </span>
            ) : null
          }
        />
      ))}
      <span className="flex-1" />
      <SidebarRunning />
      <span className="h-2" />
      <NavButton
        item={{ view: 'settings', label: 'Settings', icon: Settings }}
        active={view === 'settings'}
        onGo={() => {
          go('settings');
        }}
        trailing={<span className="text-xs text-(--color-text-faint)">⌘,</span>}
      />
    </nav>
  );
};
