import type { EnvPort } from '@ttime/core';

import { commands, type DirEntry, events, type FileStat } from './bindings';
import { unwrap } from './ipc';

/** The Rust file commands, with errors thrown as `TTimeError`. */
export type VaultFileApi = {
  readonly readText: (path: string) => Promise<string | null>;
  readonly writeAtomic: (path: string, text: string) => Promise<null>;
  readonly appendLine: (path: string, line: string) => Promise<null>;
  readonly list: (path: string) => Promise<DirEntry[]>;
  readonly mkdirp: (path: string) => Promise<null>;
  readonly mkdirExclusive: (path: string) => Promise<boolean>;
  readonly remove: (path: string, recursive: boolean) => Promise<null>;
  readonly stat: (path: string) => Promise<FileStat | null>;
};

/** Choosing the vault, the environment and change events. */
export type VaultControlApi = {
  readonly root: () => Promise<string | null>;
  readonly setRoot: (path: string) => Promise<string>;
  readonly env: () => Promise<EnvPort>;
  /** Calls `onChange` with absolute paths after files in the vault change. Returns unlisten. */
  readonly onChanged: (onChange: (paths: readonly string[]) => void) => Promise<() => void>;
};

const PLATFORMS = ['macos', 'windows', 'linux'] as const;

const toPlatform = (value: string): EnvPort['platform'] =>
  PLATFORMS.find((platform) => platform === value) ?? 'macos';

export const vaultFileApi: VaultFileApi = {
  readText: (path) => unwrap(commands.vaultReadText(path)),
  writeAtomic: (path, text) => unwrap(commands.vaultWriteAtomic(path, text)),
  appendLine: (path, line) => unwrap(commands.vaultAppendLine(path, line)),
  list: (path) => unwrap(commands.vaultList(path)),
  mkdirp: (path) => unwrap(commands.vaultMkdirp(path)),
  mkdirExclusive: (path) => unwrap(commands.vaultMkdirExclusive(path)),
  remove: (path, recursive) => unwrap(commands.vaultRemove(path, recursive)),
  stat: (path) => unwrap(commands.vaultStat(path)),
};

export const vaultControlApi: VaultControlApi = {
  root: () => unwrap(commands.vaultRoot()),
  setRoot: (path) => unwrap(commands.vaultSetRoot(path)),
  env: async () => {
    const env = await unwrap(commands.appEnv());
    return { ...env, platform: toPlatform(env.platform) };
  },
  onChanged: (onChange) =>
    events.vaultChanged.listen((event) => {
      onChange(event.payload.paths);
    }),
};
