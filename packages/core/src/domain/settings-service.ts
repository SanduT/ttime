import { TTimeError } from '../lib/errors';
import type { Logger } from '../ports/logger';
import { vaultConfigSchema, type VaultSettings } from '../schema/vault-config';
import type { Vault } from '../storage/vault';

/** Vault settings that can change; each group is replaced whole. */
export type SettingsPatch = Partial<
  Pick<
    VaultSettings,
    'weekStartsOn' | 'dayStartsAt' | 'workingHours' | 'defaultCurrency' | 'rounding' | 'csv'
  >
>;

/** Dependencies of {@link createSettingsService}. */
export type SettingsServiceDeps = {
  readonly vault: Vault;
  readonly logger: Logger;
};

/** Changes the vault-level settings in `ttime.json` (PRD 6.7). */
export type SettingsService = {
  readonly update: (patch: SettingsPatch) => Promise<VaultSettings>;
};

/** Creates the settings service. Every update is one locked, logged, undoable transaction. */
export const createSettingsService = ({ vault, logger }: SettingsServiceDeps): SettingsService => ({
  update: async (patch) => {
    if (patch.workingHours !== undefined && patch.workingHours.start >= patch.workingHours.end) {
      throw new TTimeError('input.invalid', 'Working hours must end after they start.');
    }
    const { value, batch } = await vault.transact(async (tx) => {
      const before = await tx.readConfig();
      const parsed = vaultConfigSchema.safeParse({
        ...before,
        settings: { ...before.settings, ...patch },
      });
      if (!parsed.success) {
        const reason = parsed.error.issues[0]?.message ?? 'invalid';
        throw new TTimeError('input.invalid', `Invalid setting: ${reason}`);
      }
      tx.writeConfig(parsed.data);
      tx.record({ op: 'update', kind: 'config', id: 'ttime', before, after: parsed.data });
      return parsed.data.settings;
    });
    logger.info('settings.update', { batch, keys: Object.keys(patch) });
    return value;
  },
});
