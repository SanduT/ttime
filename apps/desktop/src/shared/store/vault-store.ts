import type { Vault, VaultSnapshot } from '@ttime/core';
import { create } from 'zustand';

/** Where the window is: still loading, needs a vault (onboarding), or has one. */
export type VaultStatus = 'loading' | 'no-vault' | 'ready';

type VaultState = {
  readonly status: VaultStatus;
  readonly vault: Vault | null;
  readonly snapshot: VaultSnapshot | null;
  /** Shows a loaded vault, or onboarding when there is none or it has no `ttime.json`. */
  readonly show: (vault: Vault | null, snapshot: VaultSnapshot | null) => void;
};

/** The window's vault and its latest snapshot. */
export const useVaultStore = create<VaultState>()((set) => ({
  status: 'loading',
  vault: null,
  snapshot: null,
  show: (vault, snapshot) => {
    const usable = vault !== null && snapshot !== null && snapshot.config !== null;
    set({
      status: usable ? 'ready' : 'no-vault',
      vault: usable ? vault : null,
      snapshot: usable ? snapshot : null,
    });
  },
}));
