import { open } from '@tauri-apps/plugin-dialog';

/** Shows the native folder picker. Resolves to the chosen folder, or null if cancelled. */
export const pickFolder = (title: string): Promise<string | null> =>
  open({ directory: true, multiple: false, canCreateDirectories: true, title });
