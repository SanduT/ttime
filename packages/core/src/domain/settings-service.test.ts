import { describe, expect, test } from 'bun:test';

import { createDomainTestVault } from '../testing/domain-vault';
import { errorCodeOf } from '../testing/errors';
import { createSettingsService } from './settings-service';
import { createUndoService } from './undo-service';

const setup = async () => {
  const tv = await createDomainTestVault();
  return { ...tv, settings: createSettingsService({ vault: tv.vault, logger: tv.logger }) };
};

describe('settings.update', () => {
  test('changes only the given settings and keeps the rest', async () => {
    const t = await setup();
    const settings = await t.settings.update({ weekStartsOn: 'sunday', dayStartsAt: '04:00' });
    expect(settings).toMatchObject({
      weekStartsOn: 'sunday',
      dayStartsAt: '04:00',
      defaultCurrency: 'EUR',
    });
    const config = (await t.vault.read()).config;
    expect(config?.settings.weekStartsOn).toBe('sunday');
    expect(config?.name).toBeDefined();
  });

  test('logs a config change that undo reverts', async () => {
    const t = await setup();
    await t.settings.update({ rounding: { mode: 'up', minutes: 15, scope: 'day' } });
    expect(await t.changelog()).toContainEqual(
      expect.objectContaining({ op: 'update', kind: 'config', id: 'ttime' }),
    );
    const undo = createUndoService({ vault: t.vault, logger: t.logger });
    const state = await undo.state();
    expect(state.undo).not.toBeNull();
    if (state.undo !== null) {
      await undo.undo(state.undo.batch);
    }
    expect((await t.vault.read()).config?.settings.rounding.mode).toBe('none');
  });

  test('rejects working hours that end before they start and invalid values', async () => {
    const t = await setup();
    const backwards = t.settings.update({
      workingHours: { days: ['mon'], start: '18:00', end: '09:00' },
    });
    expect(await errorCodeOf(backwards)).toBe('input.invalid');
    expect(await errorCodeOf(t.settings.update({ defaultCurrency: 'euro' }))).toBe('input.invalid');
  });
});
