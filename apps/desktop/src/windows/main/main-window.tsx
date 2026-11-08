import { OnboardingScreen } from '../../features/onboarding';
import { MainShell } from '../../features/shell';
import { VaultGate } from '../../features/vault';

export const MainWindow = () => (
  <VaultGate onboarding={<OnboardingScreen />}>
    <MainShell />
  </VaultGate>
);
