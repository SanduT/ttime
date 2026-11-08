import { homedir } from 'node:os';
import { join } from 'node:path';
import { pid } from 'node:process';

import { expect, test } from 'bun:test';

import { createNodeEnv } from './node-env';

test('on macOS config and locks live in ~/.config/ttime', () => {
  const env = createNodeEnv();
  expect(env.platform).toBe('macos');
  expect(env.homeDir).toBe(homedir());
  expect(env.configDir).toBe(join(homedir(), '.config', 'ttime'));
  expect(env.pid).toBe(pid);
});
