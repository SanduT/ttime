import { Clock, FolderOpen, FolderPlus } from 'lucide-react';
import { useId, useState } from 'react';

import { useVaultPicker } from '../../../shared/hooks/use-vault-picker';
import { useVaultStore } from '../../../shared/store/vault-store';
import { Button } from '../../../shared/ui/button';
import { TextInput } from '../../../shared/ui/field';

const PILLARS = [
  { title: 'One shortcut', body: 'Start, switch and add notes over any app.' },
  { title: 'Your files', body: 'Plain JSON in a folder you choose.' },
  { title: 'Ready to bill', body: 'Reports and CSV exports per client.' },
] as const;

/** Step title with an optional "Step n of 3" line above it. */
export const StepTitle = ({
  step,
  title,
  body,
}: {
  readonly step?: number;
  readonly title: string;
  readonly body: string;
}) => (
  <div className="flex flex-col gap-3">
    {step === undefined ? null : (
      <p className="text-xs font-semibold tracking-[0.08em] text-(--color-accent) uppercase">
        Step {step} of 3
      </p>
    )}
    <h1 className="text-[28px] font-bold tracking-[-0.025em]">{title}</h1>
    <p className="max-w-lg text-[15px] leading-relaxed text-(--color-text-muted)">{body}</p>
  </div>
);

/** What ttime is, in one paragraph and three cards. */
export const WelcomeStep = () => (
  <div className="flex flex-col gap-6">
    <span className="flex size-16 items-center justify-center rounded-[18px] border border-(--color-border) bg-(--color-raised) shadow-(--shadow-pop)">
      <Clock size={30} className="text-(--color-accent)" />
    </span>
    <StepTitle
      title="Welcome to ttime"
      body="Track time from anywhere with one shortcut and see the running timer in the menu bar. Everything is saved as plain files in a folder you own. Nothing leaves your Mac."
    />
    <div className="grid grid-cols-3 gap-3">
      {PILLARS.map((pillar) => (
        <div
          key={pillar.title}
          className="flex flex-col gap-1.5 rounded-xl border border-(--color-border) bg-(--color-raised) p-3.5"
        >
          <span className="text-[13px] font-semibold">{pillar.title}</span>
          <span className="text-xs leading-snug text-(--color-text-muted)">{pillar.body}</span>
        </div>
      ))}
    </div>
  </div>
);

/** Create or open a vault; with one open already, it is shown instead. */
export const VaultStep = () => {
  const vaultName = useVaultStore((state) => state.snapshot?.config?.name ?? null);
  const { busy, createVault, openVault } = useVaultPicker();
  const [name, setName] = useState('My time');
  const nameId = useId();
  return (
    <div className="flex flex-col gap-6">
      <StepTitle
        step={1}
        title="Where should your time live?"
        body="A vault is a folder of JSON files. Keep it in iCloud Drive or a git repository if you like. You can switch vaults later in Settings."
      />
      {vaultName === null ? (
        <div className="grid grid-cols-2 gap-3">
          <form
            className="flex flex-col gap-2.5 rounded-xl border border-(--color-accent) bg-(--color-accent-tint) p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void createVault(name);
            }}
          >
            <label htmlFor={nameId} className="flex items-center gap-2 text-sm font-semibold">
              <FolderPlus size={16} className="text-(--color-accent)" />
              New vault
            </label>
            <TextInput
              id={nameId}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
            <Button type="submit" variant="primary" disabled={busy}>
              Create vault…
            </Button>
          </form>
          <button
            type="button"
            disabled={busy}
            className="flex flex-col items-start gap-2 rounded-xl border border-(--color-border) bg-(--color-raised) p-4 text-left transition-colors hover:bg-(--color-hover)"
            onClick={() => void openVault()}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <FolderOpen size={16} className="text-(--color-text-muted)" />
              Open an existing vault
            </span>
            <span className="text-xs text-(--color-text-muted)">Pick a folder with ttime.json</span>
          </button>
        </div>
      ) : (
        <p className="rounded-xl border border-(--color-border) bg-(--color-raised) p-4 text-sm">
          Using the vault <span className="font-semibold">{vaultName}</span>.
        </p>
      )}
    </div>
  );
};
