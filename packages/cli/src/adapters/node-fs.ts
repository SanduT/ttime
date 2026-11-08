import { randomBytes } from 'node:crypto';
import { appendFile, mkdir, open, readdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { pid } from 'node:process';

import { type FsPort, TTimeError } from '@ttime/core';

const TEMP_SUFFIX_BYTES = 6;

const isErrno = (error: unknown, code: string): boolean =>
  error instanceof Error && 'code' in error && error.code === code;

/** Runs a file operation and reports failures as `io.failed` with the path and the cause. */
const io = async <T>(operation: string, path: string, fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error: unknown) {
    throw new TTimeError('io.failed', `Could not ${operation} ${path}`, {
      details: { operation, path },
      cause: error,
    });
  }
};

const syncPath = async (path: string, flags: string): Promise<void> => {
  const handle = await open(path, flags);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
};

const writeAtomic = (path: string, text: string): Promise<void> =>
  io('write', path, async () => {
    const suffix = `${String(pid)}.${randomBytes(TEMP_SUFFIX_BYTES).toString('hex')}`;
    const temp = join(dirname(path), `.${basename(path)}.${suffix}.tmp`);
    const handle = await open(temp, 'wx');
    try {
      await handle.writeFile(text, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      await rename(temp, path);
    } catch (error: unknown) {
      await rm(temp, { force: true });
      throw error;
    }
    // Persist the rename itself.
    await syncPath(dirname(path), 'r');
  });

/** {@link FsPort} on the local file system, for the CLI and MCP server (Bun). */
export const createNodeFs = (): FsPort => ({
  readText: (path) =>
    io('read', path, async () => {
      try {
        return await readFile(path, 'utf8');
      } catch (error: unknown) {
        if (isErrno(error, 'ENOENT')) {
          return null;
        }
        throw error;
      }
    }),
  writeAtomic,
  appendLine: (path, line) => io('append to', path, () => appendFile(path, `${line}\n`, 'utf8')),
  list: (dir) =>
    io('list', dir, async () => {
      try {
        const entries = await readdir(dir, { withFileTypes: true });
        return entries
          .map((entry) => ({ name: entry.name, isDir: entry.isDirectory() }))
          .sort((a, b) => a.name.localeCompare(b.name));
      } catch (error: unknown) {
        if (isErrno(error, 'ENOENT')) {
          return [];
        }
        throw error;
      }
    }),
  mkdirp: (path) =>
    io('create', path, async () => {
      await mkdir(path, { recursive: true });
    }),
  mkdirExclusive: (path) =>
    io('create', path, async () => {
      try {
        await mkdir(path);
        return true;
      } catch (error: unknown) {
        if (isErrno(error, 'EEXIST')) {
          return false;
        }
        throw error;
      }
    }),
  remove: (path, options) =>
    io('remove', path, () => rm(path, { recursive: options?.recursive === true, force: true })),
  stat: (path) =>
    io('stat', path, async () => {
      try {
        const info = await stat(path);
        return { mtimeMs: info.mtimeMs, size: info.size };
      } catch (error: unknown) {
        if (isErrno(error, 'ENOENT')) {
          return null;
        }
        throw error;
      }
    }),
});
