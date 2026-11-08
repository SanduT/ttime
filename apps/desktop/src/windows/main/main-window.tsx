import { OnboardingScreen } from '../../features/onboarding';
import { VaultGate, VaultOverview } from '../../features/vault';

export const MainWindow = () => (
  <VaultGate onboarding={<OnboardingScreen />}>
    <VaultOverview />
  </VaultGate>
);
