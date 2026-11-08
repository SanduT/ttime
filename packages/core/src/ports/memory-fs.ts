import { TTimeError } from '../lib/errors';
import { dirName } from '../lib/path';
import { utf8Bytes } from '../lib/utf8';
import type { DirEntry, FileStat, FsPort } from './fs-port';

/** File operations MemoryFs can be told to fail, to simulate crashes and disk errors. */
export type FsOperation = 'writeAtomic' | 'appendLine' | 'remove' | 'mkdirExclusive';

/** In-memory {@link FsPort} for tests and the browser dev mode. */
export type MemoryFs = FsPort & {
  /** Snapshot of every file and its contents. */
  readonly files: () => ReadonlyMap<string, string>;
  /** Makes the next matching operation throw `io.failed`, as if the process died there. */
  readonly failNext: (operation: FsOperation, pathSuffix: string) => void;
};

/** Options for {@link createMemoryFs}. */
export type MemoryFsOptions = {
  /** Source of modification times. */
  readonly nowMs: () => number;
};

type Fault = { readonly operation: FsOperation; readonly pathSuffix: string };

/** Runs `fn` so that a throw becomes a rejected promise, like real file I/O. */
const run = <T>(fn: () => T): Promise<T> =>
  new Promise((resolve) => {
    resolve(fn());
  });

/** The file tree behind MemoryFs: files and directories with modification times. */
const createTree = (nowMs: () => number) => {
  const files = new Map<string, { text: string; mtimeMs: number }>();
  const dirs = new Map<string, number>([['/', nowMs()]]);
  const childrenOf = (dir: string): string[] => {
    const prefix = dir === '/' ? '/' : `${dir}/`;
    return [...files.keys(), ...dirs.keys()].filter(
      (p) => p !== dir && p.startsWith(prefix) && !p.slice(prefix.length).includes('/'),
    );
  };
  const mkdirp = (path: string): void => {
    if (!dirs.has(path)) {
      mkdirp(dirName(path));
      dirs.set(path, nowMs());
    }
  };
  const requireParent = (path: string): void => {
    if (!dirs.has(dirName(path))) {
      throw new TTimeError('io.failed', `Parent directory missing: ${path}`, { details: { path } });
    }
  };
  const remove = (path: string, recursive: boolean): void => {
    if (files.delete(path) || !dirs.has(path)) {
      return;
    }
    if (childrenOf(path).length > 0 && !recursive) {
      throw new TTimeError('io.failed', `Directory not empty: ${path}`);
    }
    for (const key of [...files.keys(), ...dirs.keys()]) {
      if (key.startsWith(`${path}/`)) {
        files.delete(key);
        dirs.delete(key);
      }
    }
    dirs.delete(path);
  };
  const stat = (path: string): FileStat | null => {
    const file = files.get(path);
    if (file !== undefined) {
      return { mtimeMs: file.mtimeMs, size: utf8Bytes(file.text).length };
    }
    const dirMtime = dirs.get(path);
    return dirMtime === undefined ? null : { mtimeMs: dirMtime, size: 0 };
  };
  return { files, dirs, childrenOf, mkdirp, requireParent, remove, stat };
};

/** Creates an empty in-memory file system rooted at `/`. */
export const createMemoryFs = ({ nowMs }: MemoryFsOptions): MemoryFs => {
  const tree = createTree(nowMs);
  const faults: Fault[] = [];
  const guard = (operation: FsOperation, path: string): void => {
    const index = faults.findIndex((f) => f.operation === operation && path.endsWith(f.pathSuffix));
    if (index >= 0) {
      faults.splice(index, 1);
      throw new TTimeError('io.failed', `Injected failure: ${operation} ${path}`);
    }
  };
  const put = (path: string, text: string): void => {
    tree.requireParent(path);
    tree.files.set(path, { text, mtimeMs: nowMs() });
  };

  return {
    files: () => new Map([...tree.files].map(([path, file]) => [path, file.text])),
    failNext: (operation, pathSuffix) => {
      faults.push({ operation, pathSuffix });
    },
    readText: (path) => run(() => tree.files.get(path)?.text ?? null),
    writeAtomic: (path, text) =>
      run(() => {
        guard('writeAtomic', path);
        put(path, text);
      }),
    appendLine: (path, line) =>
      run(() => {
        guard('appendLine', path);
        put(path, `${tree.files.get(path)?.text ?? ''}${line}\n`);
      }),
    list: (dir) =>
      run(() =>
        tree
          .childrenOf(dir)
          .map((p): DirEntry => ({
            name: p.slice(p.lastIndexOf('/') + 1),
            isDir: tree.dirs.has(p),
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      ),
    mkdirp: (path) =>
      run(() => {
        tree.mkdirp(path);
      }),
    mkdirExclusive: (path) =>
      run(() => {
        guard('mkdirExclusive', path);
        tree.requireParent(path);
        if (tree.dirs.has(path) || tree.files.has(path)) {
          return false;
        }
        tree.dirs.set(path, nowMs());
        return true;
      }),
    remove: (path, options) =>
      run(() => {
        guard('remove', path);
        tree.remove(path, options?.recursive === true);
      }),
    stat: (path) => run(() => tree.stat(path)),
  };
};
