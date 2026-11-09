import { OnboardingFlow, OnboardingGate } from '../../features/onboarding';
import { MainShell } from '../../features/shell';
import { VaultGate } from '../../features/vault';

export const MainWindow = () => (
  <VaultGate onboarding={<OnboardingFlow />}>
    <OnboardingGate>
      <MainShell />
    </OnboardingGate>
  </VaultGate>
);
