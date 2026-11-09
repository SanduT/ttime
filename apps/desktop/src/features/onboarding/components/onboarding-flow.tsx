import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useEffect } from 'react';

import { ONBOARDING_STEPS, useOnboardingStore } from '../../../shared/store/onboarding-store';
import { useVaultStore } from '../../../shared/store/vault-store';
import { Button } from '../../../shared/ui/button';
import { VaultStep, WelcomeStep } from './intro-steps';
import { MenuBarStep, ShortcutStep } from './setup-steps';

const STEPS: readonly { readonly id: string; readonly view: ReactNode }[] = [
  { id: 'welcome', view: <WelcomeStep /> },
  { id: 'vault', view: <VaultStep /> },
  { id: 'shortcut', view: <ShortcutStep /> },
  { id: 'menu-bar', view: <MenuBarStep /> },
];

const VAULT_STEP = 1;
const LAST_STEP = ONBOARDING_STEPS - 1;

/** Progress dots: the current step is a wider pill. */
const Dots = ({ step }: { readonly step: number }) => (
  <div className="flex flex-1 gap-1.5">
    {STEPS.map(({ id }, index) => (
      <motion.span
        key={id}
        animate={{ width: index === step ? 22 : 6 }}
        className={`h-1.5 rounded-full ${index <= step ? 'bg-(--color-accent)' : 'bg-(--color-border-strong)'}`}
      />
    ))}
  </div>
);

/** First run (and the tour from Settings): welcome, vault, shortcut, menu bar. */
export const OnboardingFlow = () => {
  const { step, go, finish, start, active } = useOnboardingStore();
  const hasVault = useVaultStore((state) => state.snapshot !== null);
  useEffect(() => {
    if (!active) {
      start();
    }
  }, [active, start]);
  // Creating or opening a vault moves on by itself.
  useEffect(() => {
    if (hasVault && step === VAULT_STEP) {
      go(VAULT_STEP + 1);
    }
  }, [hasVault, step, go]);
  const blocked = step === VAULT_STEP && !hasVault;
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="flex w-full max-w-2xl flex-col gap-10">
        <div className="min-h-[360px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {STEPS[step]?.view}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2">
          <Dots step={step} />
          {hasVault && step < LAST_STEP ? (
            <Button variant="ghost" onClick={finish}>
              Skip
            </Button>
          ) : null}
          {step > 0 ? (
            <Button
              onClick={() => {
                go(step - 1);
              }}
            >
              Back
            </Button>
          ) : null}
          <Button
            variant="primary"
            disabled={blocked}
            onClick={() => {
              if (step === LAST_STEP) {
                finish();
              } else {
                go(step + 1);
              }
            }}
          >
            {step === 0 ? 'Get started' : step === LAST_STEP ? 'Done' : 'Continue'}
          </Button>
        </div>
      </div>
    </main>
  );
};

/** Shows the flow instead of `children` while it is active. */
export const OnboardingGate = ({ children }: { readonly children: ReactNode }) => {
  const active = useOnboardingStore((state) => state.active);
  return active ? <OnboardingFlow /> : children;
};
