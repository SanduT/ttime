import { homedir } from 'node:os';
import { join } from 'node:path';
import { env, pid, platform } from 'node:process';

import type { EnvPort } from '@ttime/core';

const toPlatform = (value: string): EnvPort['platform'] => {
  if (value === 'win32') {
    return 'windows';
  }
  return value === 'darwin' ? 'macos' : 'linux';
};

/** Platform facts for the CLI. Config lives in `~/.config/ttime` (or `%APPDATA%\ttime`). */
export const createNodeEnv = (): EnvPort => {
  const kind = toPlatform(platform);
  const home = homedir();
  const appData = env['APPDATA'];
  const configDir =
    kind === 'windows' && appData !== undefined
      ? join(appData, 'ttime')
      : join(home, '.config', 'ttime');
  return { platform: kind, homeDir: home, configDir, pid };
};
