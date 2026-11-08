import type { ReactNode } from 'react';

import { useVaultLoader } from '../hooks/use-vault-loader';

type Props = {
  /** Shown when no vault is open yet. */
  readonly onboarding: ReactNode;
  readonly children: ReactNode;
};

/** Renders onboarding until a vault is open, then `children`. */
export const VaultGate = ({ onboarding, children }: Props) => {
  const status = useVaultLoader();
  if (status === 'loading') {
    return <p className="p-6 text-sm text-(--color-text-muted)">Loading vault…</p>;
  }
  return status === 'no-vault' ? onboarding : children;
};
