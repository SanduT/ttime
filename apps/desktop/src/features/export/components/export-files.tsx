import { vaultControlApi, vaultFileApi } from '../../../shared/bridge/vault-api';
import { runAction } from '../../../shared/lib/run-action';
import { useVaultStore } from '../../../shared/store/vault-store';
import { Button } from '../../../shared/ui/button';

const useRoot = () => useVaultStore((state) => state.vault?.root ?? '');

/** A written export: its path, Open (default app) and Reveal in Finder. */
export const SavedExport = ({ path }: { readonly path: string }) => {
  const root = useRoot();
  return (
    <p className="flex items-center gap-2 rounded-md bg-(--color-control) px-3 py-2 text-sm">
      <span className="min-w-0 flex-1 truncate">Saved {path}</span>
      <Button
        onClick={() => {
          void runAction('Open export', () => vaultControlApi.open(`${root}/${path}`));
        }}
      >
        Open
      </Button>
      <Button
        onClick={() => {
          void runAction('Reveal export', () => vaultControlApi.reveal(`${root}/${path}`));
        }}
      >
        Reveal in Finder
      </Button>
    </p>
  );
};

/** Opens the vault's `exports/` folder in Finder, creating it before the first export. */
export const OpenExportsButton = () => {
  const root = useRoot();
  return (
    <Button
      onClick={() => {
        void runAction('Open exports folder', async () => {
          await vaultFileApi.mkdirp(`${root}/exports`);
          await vaultControlApi.open(`${root}/exports`);
        });
      }}
    >
      Open exports folder
    </Button>
  );
};
