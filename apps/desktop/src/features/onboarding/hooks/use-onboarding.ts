import type { Vault } from '@ttime/core';
import { useState } from 'react';

import { pickFolder } from '../../../shared/adapters/dialog';
import { getAppContext } from '../../../shared/lib/app-context';
import { runAction } from '../../../shared/lib/run-action';
import type { VaultSession } from '../../../shared/lib/vault-session';
import { useVaultStore } from '../../../shared/store/vault-store';

/** Creating a new vault or opening an existing one, each through the folder picker. */
export const useOnboarding = () => {
  const show = useVaultStore((state) => state.show);
  const [busy, setBusy] = useState(false);

  const choose = async (
    label: string,
    title: string,
    use: (session: VaultSession, path: string) => Promise<Vault>,
  ): Promise<void> => {
    setBusy(true);
    await runAction(label, async () => {
      const path = await pickFolder(title);
      if (path === null) {
        return;
      }
      const vault = await use((await getAppContext()).session, path);
      show(vault, await vault.read());
    });
    setBusy(false);
  };

  return {
    busy,
    createVault: (name: string) =>
      choose('Create vault', 'Choose a folder for the new vault', (session, path) =>
        session.create(path, name),
      ),
    openVault: () =>
      choose('Open vault', 'Choose a ttime vault folder', (session, path) => session.open(path)),
  };
};
