import type { SettingsPatch, VaultSettings } from '@ttime/core';

import { csvControls, roundingSelects } from '../../export';
import { useVaultSettings } from '../hooks/use-vault-settings';
import { AppSection } from './app-section';
import { Row, Section } from './section';
import { TimeSection } from './time-section';
import { VaultSection } from './vault-section';

type VaultProps = {
  readonly settings: VaultSettings;
  readonly update: (patch: SettingsPatch) => void;
};

/** Rounding and CSV defaults for new exports. */
const ExportDefaults = ({ settings, update }: VaultProps) => {
  const rounding = roundingSelects({
    rounding: settings.rounding,
    onRounding: (value) => {
      update({ rounding: value });
    },
  });
  const csv = csvControls({
    csv: settings.csv,
    onCsv: (value) => {
      update({ csv: value });
    },
  });
  return (
    <Section title="Export defaults">
      <Row label="Rounding">
        {rounding.mode}
        {rounding.minutes}
        {rounding.scope}
      </Row>
      <Row label="CSV format">
        {csv.delimiter}
        {csv.decimal}
      </Row>
      <Row label="Excel">{csv.bom}</Row>
    </Section>
  );
};

/** Settings (PRD 6.7): app preferences, then the vault's own settings in `ttime.json`. */
export const SettingsView = () => {
  const { settings, update } = useVaultSettings();
  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-lg font-semibold">Settings</h1>
      <AppSection />
      <VaultSection />
      {settings === null ? null : (
        <>
          <TimeSection settings={settings} update={update} />
          <ExportDefaults settings={settings} update={update} />
        </>
      )}
    </section>
  );
};
