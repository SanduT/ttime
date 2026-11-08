import { stringifyStable } from '../lib/json';
import type { EnvPort } from '../ports/env-port';
import { createUlidGenerator, type IdGenerator } from '../ports/id-port';
import type { LogContext, Logger } from '../ports/logger';
import { createManualClock, type ManualClock } from '../ports/manual-clock';
import { createMemoryFs, type MemoryFs } from '../ports/memory-fs';
import type { Actor } from '../schema/primitives';
import { createVault, initVault, type Vault, type VaultDeps } from '../storage/vault';

/** One recorded log line. */
type LogLine = {
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly message: string;
  readonly context: LogContext | undefined;
};

/** A logger that keeps every line, for assertions. */
export type RecordingLogger = Logger & { readonly lines: LogLine[] };

/** Creates a {@link RecordingLogger}. */
export const createRecordingLogger = (): RecordingLogger => {
  const lines: LogLine[] = [];
  const at =
    (level: LogLine['level']) =>
    (message: string, context?: LogContext): void => {
      lines.push({ level, message, context });
    };
  return { lines, debug: at('debug'), info: at('info'), warn: at('warn'), error: at('error') };
};

/** Deterministic "random" bytes for reproducible IDs in tests. */
const createCountingBytes = (): ((length: number) => Uint8Array) => {
  let counter = 0;
  return (length) => {
    counter += 1;
    const bytes = new Uint8Array(length);
    bytes[length - 1] = counter % 256;
    bytes[length - 2] = Math.floor(counter / 256) % 256;
    return bytes;
  };
};

/** A vault on MemoryFs with a manual clock, plus everything a test needs to inspect it. */
export type TestVault = {
  readonly root: string;
  readonly fs: MemoryFs;
  readonly clock: ManualClock;
  readonly env: EnvPort;
  readonly ids: IdGenerator;
  readonly logger: RecordingLogger;
  readonly deps: VaultDeps;
  readonly vault: Vault;
  /** Writes raw text to a vault-relative path, creating folders. */
  readonly writeRaw: (relativePath: string, text: string) => Promise<void>;
  /** Writes a value as a formatted vault file. */
  readonly writeJson: (relativePath: string, value: unknown) => Promise<void>;
  /** Raw text of a vault-relative path, or null. */
  readonly readRaw: (relativePath: string) => Promise<string | null>;
};

/** Options for {@link createTestVault}. */
export type TestVaultOptions = {
  /** Start time with a bracketed zone. Default `2026-11-08T10:00:00[Europe/Bucharest]`. */
  readonly start?: string;
  readonly actor?: Actor;
  /** Create `ttime.json` and folders. Default true. */
  readonly init?: boolean;
};

const ROOT = '/vault';

/** Creates a test vault. */
export const createTestVault = async (options: TestVaultOptions = {}): Promise<TestVault> => {
  const clock = createManualClock(options.start ?? '2026-11-08T10:00:00[Europe/Bucharest]');
  const fs = createMemoryFs({ nowMs: () => clock.now().epochMilliseconds });
  const env: EnvPort = { platform: 'macos', homeDir: '/home', configDir: '/config', pid: 4242 };
  const ids = createUlidGenerator({ clock, randomBytes: createCountingBytes() });
  const logger = createRecordingLogger();
  const deps: VaultDeps = {
    fs,
    clock,
    env,
    ids,
    logger,
    root: ROOT,
    actor: options.actor ?? 'app',
  };
  if (options.init ?? true) {
    await initVault(deps, 'Test vault');
  }
  const absolute = (relativePath: string): string => `${ROOT}/${relativePath}`;
  const writeRaw = async (relativePath: string, text: string): Promise<void> => {
    const path = absolute(relativePath);
    await fs.mkdirp(path.slice(0, path.lastIndexOf('/')));
    await fs.writeAtomic(path, text);
  };
  return {
    root: ROOT,
    fs,
    clock,
    env,
    ids,
    logger,
    deps,
    vault: createVault(deps),
    writeRaw,
    writeJson: (relativePath, value) => writeRaw(relativePath, stringifyStable(value)),
    readRaw: (relativePath) => fs.readText(absolute(relativePath)),
  };
};
