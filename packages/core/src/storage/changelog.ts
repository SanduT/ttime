import { tryParseJson } from '../lib/json';
import type { FsPort } from '../ports/fs-port';
import { type Change, changeSchema } from '../schema/changelog';
import type { VaultPaths } from './paths';

const MONTH_FILE_PATTERN = /^(\d{4}-\d{2})\.jsonl$/;

/** Changelog months present in the vault, newest first. */
export const listChangelogMonths = async (fs: FsPort, paths: VaultPaths): Promise<string[]> =>
  (await fs.list(paths.changelogDir))
    .filter((entry) => !entry.isDir)
    .map((entry) => MONTH_FILE_PATTERN.exec(entry.name)?.[1])
    .filter((month): month is string => month !== undefined)
    .sort()
    .reverse();

/**
 * The changes in one month's changelog, in file order. Lines that are not valid JSON or not a
 * change (a hand edit, a torn append) are skipped: the changelog is history, not data.
 */
export const readChangelogMonth = async (
  fs: FsPort,
  paths: VaultPaths,
  month: string,
): Promise<Change[]> => {
  const text = (await fs.readText(paths.changelog(month))) ?? '';
  return text.split('\n').flatMap((line) => {
    if (line.trim() === '') {
      return [];
    }
    const json = tryParseJson(line);
    if (!json.ok) {
      return [];
    }
    const change = changeSchema.safeParse(json.value);
    return change.success ? [change.data] : [];
  });
};

/** Changes of the newest `months` changelog files (all when omitted), oldest first. */
export const readChangelog = async (
  fs: FsPort,
  paths: VaultPaths,
  months?: number,
): Promise<Change[]> => {
  const selected = (await listChangelogMonths(fs, paths)).slice(0, months).reverse();
  const perMonth = await Promise.all(selected.map((month) => readChangelogMonth(fs, paths, month)));
  return perMonth.flat();
};
