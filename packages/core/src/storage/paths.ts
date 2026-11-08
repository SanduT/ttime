import { joinPath } from '../lib/path';
import type { LocalDate } from '../lib/time';

/** File name of a day file, `yyyy-mm-dd.json`. */
export const DAY_FILE_PATTERN = /^(\d{4}-\d{2}-\d{2})\.json$/;

/** File name of a client or project file, `<slug>.json`. */
export const RECORD_FILE_PATTERN = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;

/** Every path in a vault. The only code that knows the on-disk layout (ARCHITECTURE 4.1). */
export type VaultPaths = {
  readonly root: string;
  readonly config: string;
  readonly running: string;
  readonly clientsDir: string;
  readonly projectsDir: string;
  readonly entriesDir: string;
  readonly changelogDir: string;
  readonly exportsDir: string;
  readonly trashEntriesDir: string;
  readonly client: (id: string) => string;
  readonly project: (id: string) => string;
  readonly day: (date: LocalDate) => string;
  readonly changelog: (month: string) => string;
  readonly trashEntry: (id: string) => string;
  readonly relative: (path: string) => string;
};

/** The paths of the vault at `root`. */
export const vaultPaths = (root: string): VaultPaths => {
  const entriesDir = joinPath(root, 'entries');
  const trashEntriesDir = joinPath(root, '.trash', 'entries');
  const clientsDir = joinPath(root, 'clients');
  const projectsDir = joinPath(root, 'projects');
  const changelogDir = joinPath(root, 'changelog');
  return {
    root,
    config: joinPath(root, 'ttime.json'),
    running: joinPath(root, 'running.json'),
    clientsDir,
    projectsDir,
    entriesDir,
    changelogDir,
    exportsDir: joinPath(root, 'exports'),
    trashEntriesDir,
    client: (id) => joinPath(clientsDir, `${id}.json`),
    project: (id) => joinPath(projectsDir, `${id}.json`),
    day: (date) => joinPath(entriesDir, date.slice(0, 4), date.slice(5, 7), `${date}.json`),
    changelog: (month) => joinPath(changelogDir, `${month}.jsonl`),
    trashEntry: (id) => joinPath(trashEntriesDir, `${id}.json`),
    relative: (path) => (path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path),
  };
};
