import {
  type ClockPort,
  createVault,
  type EnvPort,
  type FsPort,
  type IdGenerator,
  initVault,
  type Logger,
  TTimeError,
  type Vault,
  type VaultDeps,
  writeAppConfig,
} from '@ttime/core';

import type { VaultControlApi } from '../bridge/vault-api';

/** Dependencies of {@link createVaultSession}. */
export type VaultSessionDeps = {
  readonly control: VaultControlApi;
  readonly fs: FsPort;
  readonly env: EnvPort;
  readonly clock: ClockPort;
  readonly ids: IdGenerator;
  readonly logger: Logger;
};

/** Which vault this window works on, and choosing or creating one. */
export type VaultSession = {
  /** The vault Rust has open (restored from the config file at launch), or null. */
  readonly current: () => Promise<Vault | null>;
  /** Opens an existing vault folder and saves it in the config file. */
  readonly open: (path: string) => Promise<Vault>;
  /** Creates a vault in `path` (which must not hold one yet) and saves it in the config file. */
  readonly create: (path: string, name: string) => Promise<Vault>;
};

/** Creates the session. The config file is only written once the vault is usable. */
export const createVaultSession = (deps: VaultSessionDeps): VaultSession => {
  const { control, fs, env, logger } = deps;
  const depsFor = (root: string): VaultDeps => ({ ...deps, root, actor: 'app' });

  /** Points Rust at `path`, runs `prepare`, saves the config; restores the old root on failure. */
  const switchTo = async (
    path: string,
    prepare: (vaultDeps: VaultDeps, vault: Vault) => Promise<void>,
  ): Promise<Vault> => {
    const previous = await control.root();
    const root = await control.setRoot(path);
    try {
      const vaultDeps = depsFor(root);
      const vault = createVault(vaultDeps);
      await prepare(vaultDeps, vault);
      await writeAppConfig(fs, env, { vault: root });
      logger.info('Vault chosen');
      return vault;
    } catch (error) {
      if (previous !== null && previous !== root) {
        await control.setRoot(previous);
      }
      throw error;
    }
  };

  return {
    current: async () => {
      const root = await control.root();
      return root === null ? null : createVault(depsFor(root));
    },
    open: (path) =>
      switchTo(path, async (_deps, vault) => {
        if ((await vault.read()).config === null) {
          throw new TTimeError(
            'vault.missing_config',
            'That folder is not a ttime vault. Choose a folder with a ttime.json, or create a new vault.',
          );
        }
      }),
    create: (path, name) => {
      const clean = name.trim();
      if (clean === '') {
        return Promise.reject(new TTimeError('input.invalid', 'Give the vault a name.'));
      }
      return switchTo(path, (vaultDeps) => initVault(vaultDeps, clean));
    },
  };
};
