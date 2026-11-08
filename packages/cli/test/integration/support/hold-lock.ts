// Child process for the stale lock test: takes the vault lock, reports it, then hangs until
// killed. Usage: bun hold-lock.ts <tempDir> <vaultRoot>
import { argv, exit, stderr, stdout } from 'node:process';

import { createVault } from '@ttime/core';

import { nodeDeps } from './temp-vault';

const KEEP_ALIVE_MS = 1000;
const [, , dir, root] = argv;
if (dir === undefined || root === undefined) {
  stderr.write('usage: hold-lock.ts <tempDir> <vaultRoot>\n');
  exit(64);
}

await createVault(nodeDeps(dir, root)).transact(
  () =>
    new Promise<never>(() => {
      stdout.write('locked\n');
      setInterval(() => null, KEEP_ALIVE_MS);
    }),
);
