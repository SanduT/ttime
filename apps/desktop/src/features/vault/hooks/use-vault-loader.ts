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

/** Loads the vault Rust has open, then reloads the snapshot whenever its files change. */
export const useVaultLoader = (options: VaultLoaderOptions = {}): VaultStatus => {
  const { days } = options;
  const status = useVaultStore((state) => state.status);
  const vault = useVaultStore((state) => state.vault);
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
    // Another window (Settings) may open a different vault: load it here too.
    const unlisten = getAppContext().then((context) =>
      context.onVaultOpened(() => {
        void load();
      }),
    );
    return () => {
      void unlisten.then((stop) => {
        stop();
      });
    };
  }, [show, days]);

  useEffect(() => {
    if (vault === null) {
      return;
    }
    let active = true;
    let unlisten: (() => void) | undefined;
    void runAction('Watch vault', async () => {
      const stop = await (
        await getAppContext()
      ).onVaultChanged(() => {
        void runAction('Reload vault', async () => {
          show(vault, await vault.read(await readOptions(days)));
        });
      });
      if (active) {
        unlisten = stop;
      } else {
        stop();
      }
    });
    return () => {
      active = false;
      unlisten?.();
    };
  }, [vault, show, days]);

  return status;
};
