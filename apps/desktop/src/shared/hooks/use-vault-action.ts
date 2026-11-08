import { useCallback } from 'react';

import { runAction } from '../lib/run-action';
import { servicesFor, type VaultServices } from '../lib/vault-services';
import { useVaultStore } from '../store/vault-store';

/**
 * Runs `action` with the window's core services; failures become toasts. Returns the action's
 * value, or undefined when it failed or no vault is open.
 */
export const useVaultAction = () => {
  const vault = useVaultStore((state) => state.vault);
  return useCallback(
    async <T>(label: string, action: (services: VaultServices) => Promise<T>) =>
      runAction(label, async () => (vault === null ? undefined : action(await servicesFor(vault)))),
    [vault],
  );
};
