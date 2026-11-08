import { useVaultStore } from '../../../shared/store/vault-store';
import { AnalyticsView } from '../../analytics';
import { CalendarView } from '../../calendar';
import { IssuesView } from '../../issues';
import { ProjectsView } from '../../projects';
import { SettingsView } from '../../settings';
import { TodayView } from '../../today';
import { useSettingsShortcut } from '../hooks/use-settings-shortcut';
import { useUndoShortcuts } from '../hooks/use-undo-shortcuts';
import { useNavStore } from '../store/nav-store';
import { Sidebar } from './sidebar';

/** The main window: sidebar and the selected view. ⌘Z and ⇧⌘Z work everywhere. */
export const MainShell = () => {
  useUndoShortcuts();
  useSettingsShortcut();
  const view = useNavStore((state) => state.view);
  const readOnly = useVaultStore((state) => state.snapshot?.readOnly ?? false);
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto p-6">
        {readOnly ? (
          <p className="mb-4 rounded-md bg-(--color-control) px-3 py-2 text-sm text-(--color-danger)">
            This vault was written by a newer ttime, so it is read-only here.
          </p>
        ) : null}
        {view === 'today' ? <TodayView /> : null}
        {view === 'calendar' ? <CalendarView /> : null}
        {view === 'projects' ? <ProjectsView /> : null}
        {view === 'analytics' ? <AnalyticsView /> : null}
        {view === 'issues' ? <IssuesView /> : null}
        {view === 'settings' ? <SettingsView /> : null}
      </main>
    </div>
  );
};
