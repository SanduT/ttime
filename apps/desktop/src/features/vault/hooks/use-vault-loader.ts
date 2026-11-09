import type { LocalDate } from '@ttime/core';
import { useEffect } from 'react';

import { getAppContext } from '../../../shared/lib/app-context';
import { runAction } from '../../../shared/lib/run-action';
import { useVaultStore, type VaultStatus } from '../../../shared/store/vault-store';

/** Options for {@link useVaultLoader}. */
export type VaultLoaderOptions = {
  /** Days to load back from today; all days when left out. */
  readonly days?: number;
};

const readOptions = async (days: number | undefined): Promise<{ readonly since?: LocalDate }> => {
  if (days === undefined) {
    return {};
  }
  const { clock } = await getAppContext();
  return { since: clock.now().toPlainDate().subtract({ days }).toString() };
};

/**
 * Loads the vault Rust has open, and loads it again whenever another window opens a vault or
 * the vault's files change. Reloading on file changes even while no vault is usable matters on
 * first run: creating a vault opens the folder before `ttime.json` exists, so the first load
 * finds no vault and only the files written afterwards make it usable.
 */
export const useVaultLoader = (options: VaultLoaderOptions = {}): VaultStatus => {
  const { days } = options;
  const status = useVaultStore((state) => state.status);
  const show = useVaultStore((state) => state.show);

  useEffect(() => {
    const load = async () => {
      const loaded = await runAction('Load vault', async () => {
        const current = await (await getAppContext()).session.current();
        show(current, current === null ? null : await current.read(await readOptions(days)));
        return true;
      });
      if (loaded === undefined) {
        show(null, null);
      }
    };
    void load();
    const reload = () => {
      void load();
    };
    const unlisten = getAppContext().then(async (context) => {
      const stops = await Promise.all([
        context.onVaultOpened(reload),
        context.onVaultChanged(reload),
      ]);
      return () => {
        for (const stop of stops) {
          stop();
        }
      };
    });
    return () => {
      void unlisten.then((stop) => {
        stop();
      });
    };
  }, [show, days]);

  return status;
};
