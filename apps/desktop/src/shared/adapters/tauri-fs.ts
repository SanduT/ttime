import type { FsPort } from '@ttime/core';

import { type VaultFileApi, vaultFileApi } from '../bridge/vault-api';

/** {@link FsPort} on the Rust `vault_io` commands. Paths outside the allow-list fail. */
export const createTauriFs = (api: VaultFileApi = vaultFileApi): FsPort => ({
  readText: (path) => api.readText(path),
  writeAtomic: async (path, text) => {
    await api.writeAtomic(path, text);
  },
  appendLine: async (path, line) => {
    await api.appendLine(path, line);
  },
  list: (dir) => api.list(dir),
  mkdirp: async (path) => {
    await api.mkdirp(path);
  },
  mkdirExclusive: (path) => api.mkdirExclusive(path),
  remove: async (path, options) => {
    await api.remove(path, options?.recursive === true);
  },
  stat: async (path) => {
    const stat = await api.stat(path);
    // Rust floats arrive as `number | null` (null would mean NaN, which never happens).
    return stat === null ? null : { mtimeMs: stat.mtimeMs ?? 0, size: stat.size ?? 0 };
  },
});
