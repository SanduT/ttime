import { describe, expect, test } from 'bun:test';

import { createDomainTestVault } from '../testing/domain-vault';
import { errorCodeOf } from '../testing/errors';
import { createIdleService, type IdleChoice } from './idle-service';

// The clock starts at 2026-11-08 10:00 Europe/Bucharest.
const at = (time: string) => `2026-11-08T${time}:00+02:00`;

const setup = async () => {
  const t = await createDomainTestVault();
  await t.timer.start({ project: 'acme-website', description: 'auth', start: at('09:00') });
  const idle = createIdleService({ vault: t.vault, ids: t.ids, logger: t.logger });
  const resolve = (choice: IdleChoice, project?: string) =>
    idle.resolve({
      choice,
      idleSince: at('09:20'),
      returnedAt: at('09:50'),
      ...(project === undefined ? {} : { project }),
    });
  return { ...t, resolve };
};

describe('idle.resolve', () => {
  test('keep changes nothing', async () => {
    const t = await setup();
    await t.resolve('keep');
    expect((await t.vault.read()).running?.start).toBe(at('09:00'));
    expect(await t.day()).toEqual([]);
  });

  test('discard ends at idle and continues the same entry at return', async () => {
    const t = await setup();
    await t.resolve('discard');
    expect((await t.day()).map((e) => [e.start, e.end, e.description])).toEqual([
      [at('09:00'), at('09:20'), 'auth'],
    ]);
    expect((await t.vault.read()).running).toMatchObject({
      start: at('09:50'),
      project: 'acme-website',
      description: 'auth',
    });
  });

  test('discard and stop leaves nothing running', async () => {
    const t = await setup();
    await t.resolve('discard-stop');
    expect((await t.day()).map((e) => e.end)).toEqual([at('09:20')]);
    expect((await t.vault.read()).running).toBeNull();
  });

  test('assign gives the idle stretch to another project and continues', async () => {
    const t = await setup();
    await t.resolve('assign', 'internal');
    expect((await t.day()).map((e) => [e.project, e.start, e.end])).toEqual([
      ['acme-website', at('09:00'), at('09:20')],
      ['internal', at('09:20'), at('09:50')],
    ]);
    expect((await t.vault.read()).running?.start).toBe(at('09:50'));
  });

  test('refuses idle before the running entry started', async () => {
    const t = await setup();
    const idle = createIdleService({ vault: t.vault, ids: t.ids, logger: t.logger });
    const early = idle.resolve({
      choice: 'discard',
      idleSince: at('08:00'),
      returnedAt: at('09:50'),
    });
    expect(await errorCodeOf(early)).toBe('input.invalid');
    const backwards = idle.resolve({
      choice: 'discard',
      idleSince: at('09:30'),
      returnedAt: at('09:20'),
    });
    expect(await errorCodeOf(backwards)).toBe('input.invalid');
  });
});
