/** One entry of a directory listing. */
export type DirEntry = { readonly name: string; readonly isDir: boolean };

/** File metadata. */
export type FileStat = { readonly mtimeMs: number; readonly size: number };

/**
 * File access for core. Paths are absolute and `/`-separated. Implementations: NodeFs (CLI),
 * TauriFs (desktop, through the Rust `vault_io` commands), MemoryFs (tests, browser dev mode).
 * Failures throw `TTimeError` with an `io.*` code.
 */
export type FsPort = {
  /** File contents, or null when the file does not exist. */
  readonly readText: (path: string) => Promise<string | null>;
  /** Writes a temp file in the same directory, syncs it, then renames it over `path`. */
  readonly writeAtomic: (path: string, text: string) => Promise<void>;
  /** Appends `line` plus a newline. */
  readonly appendLine: (path: string, line: string) => Promise<void>;
  /** Direct children of `dir`; empty when `dir` does not exist. */
  readonly list: (dir: string) => Promise<readonly DirEntry[]>;
  /** Creates `path` and its missing parents. */
  readonly mkdirp: (path: string) => Promise<void>;
  /** Creates `path` (parent must exist); false when it already exists. The lock primitive. */
  readonly mkdirExclusive: (path: string) => Promise<boolean>;
  /** Removes a file or directory; missing paths are ignored. */
  readonly remove: (path: string, options?: { readonly recursive?: boolean }) => Promise<void>;
  /** Metadata, or null when the path does not exist. */
  readonly stat: (path: string) => Promise<FileStat | null>;
};
