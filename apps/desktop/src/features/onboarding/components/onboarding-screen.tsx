import { useId, useState } from 'react';

import { Button } from '../../../shared/ui/button';
import { useOnboarding } from '../hooks/use-onboarding';

/** First run: create a vault or open an existing one. */
export const OnboardingScreen = () => {
  const { busy, createVault, openVault } = useOnboarding();
  const [name, setName] = useState('My time');
  const nameId = useId();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Welcome to ttime</h1>
        <p className="text-sm text-(--color-text-muted)">
          ttime keeps your time in a folder of plain JSON files that you own. Create a new vault or
          open one you already have. You can sync the folder with any tool you like.
        </p>
      </header>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void createVault(name);
        }}
      >
        <label htmlFor={nameId} className="text-xs font-medium">
          Vault name
        </label>
        <input
          id={nameId}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          className="rounded-md border border-(--color-border) bg-transparent px-2 py-1.5 text-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-(--color-accent)"
        />
        <Button type="submit" variant="primary" disabled={busy}>
          Create vault…
        </Button>
      </form>
      <Button disabled={busy} onClick={() => void openVault()}>
        Open existing vault…
      </Button>
    </main>
  );
};
