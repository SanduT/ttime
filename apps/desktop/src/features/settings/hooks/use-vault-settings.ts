import type { SettingsPatch } from '@ttime/core';

import { useVaultAction } from '../../../shared/hooks/use-vault-action';
import { useVaultStore } from '../../../shared/store/vault-store';

/** The vault's settings (`ttime.json`) and saving a change to them. */
export const useVaultSettings = () => {
  const settings = useVaultStore((state) => state.snapshot?.config?.settings ?? null);
  const act = useVaultAction();
  const update = (patch: SettingsPatch) => {
    void act('Save settings', (services) => services.settings.update(patch));
  };
  return { settings, update };
};
