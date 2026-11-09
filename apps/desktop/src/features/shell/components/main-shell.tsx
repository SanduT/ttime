import { motion } from 'motion/react';

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
      <main className="min-w-0 flex-1 overflow-y-auto px-8 py-7">
        {readOnly ? (
          <p className="mb-4 rounded-md bg-(--color-control) px-3 py-2 text-sm text-(--color-danger)">
            This vault was written by a newer ttime, so it is read-only here.
          </p>
        ) : null}
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {view === 'today' ? <TodayView /> : null}
          {view === 'calendar' ? <CalendarView /> : null}
          {view === 'projects' ? <ProjectsView /> : null}
          {view === 'analytics' ? <AnalyticsView /> : null}
          {view === 'issues' ? <IssuesView /> : null}
          {view === 'settings' ? <SettingsView /> : null}
        </motion.div>
      </main>
    </div>
  );
};
