import { vaultControlApi } from '../../../shared/bridge/vault-api';
import { runAction } from '../../../shared/lib/run-action';
import { useVaultStore } from '../../../shared/store/vault-store';
import { Button } from '../../../shared/ui/button';
import { useOnboarding } from '../../onboarding';
import { Row, Section } from './section';

/** Where the vault lives, Reveal in Finder, and switching to another vault. */
export const VaultSection = () => {
  const root = useVaultStore((state) => state.vault?.root ?? '');
  const { busy, openVault } = useOnboarding();
  return (
    <Section title="Vault">
      <Row label="Location">
        <span className="truncate text-sm" title={root}>
          {root}
        </span>
      </Row>
      <Row label="">
        <Button
          onClick={() => {
            void runAction('Reveal vault', () => vaultControlApi.reveal(root));
          }}
        >
          Reveal in Finder
        </Button>
        <Button
          disabled={busy}
          onClick={() => {
            void openVault();
          }}
        >
          Open another vault…
        </Button>
      </Row>
    </Section>
  );
};
