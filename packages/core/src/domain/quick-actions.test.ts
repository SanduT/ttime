import { describe, expect, test } from 'bun:test';

import { buildEntry } from '../testing/builders';
import { createDomainTestVault } from '../testing/domain-vault';
import { errorCodeOf } from '../testing/errors';
import { createQuickActions } from './quick-actions';
import { planQuickInput, type QuickContext } from './quick-plan';
import { recentEntries } from './recent-entries';

const setup = async () => {
  const tv = await createDomainTestVault();
  const quick = createQuickActions({
    vault: tv.vault,
    clock: tv.clock,
    ids: tv.ids,
    logger: tv.logger,
  });
  const context = async (): Promise<QuickContext> => {
    const snapshot = await tv.vault.read();
    const entries = [...snapshot.days.values()].flatMap((day) => day.entries);
    return {
      projects: [...snapshot.projects.values()],
      running: snapshot.running,
      recent: recentEntries(entries),
    };
  };
  const plan = async (text: string) => planQuickInput(text, await context());
  return { ...tv, quick, plan };
};

describe('start', () => {
  test('starts the parsed entry, backdated from now', async () => {
    const t = await setup();
    const { started } = await t.quick.start(await t.plan('auth refactor @acme #dev -20m'));
    expect(started).toMatchObject({
      project: 'acme-website',
      description: 'auth refactor',
      tags: ['dev'],
      start: '2026-11-08T09:40:00+02:00',
    });
  });

  test('starts at a clock time today', async () => {
    const t = await setup();
    const { started } = await t.quick.start(await t.plan('standup @internal at 9:30'));
    expect(started.start).toBe('2026-11-08T09:30:00+02:00');
  });

  test('applies $ and !$ over the project default', async () => {
    const t = await setup();
    const { started } = await t.quick.start(await t.plan('review @acme !$'));
    expect(started.billable).toBe(false);
  });

  test('creates the project when nothing matches', async () => {
    const t = await setup();
    const { started } = await t.quick.start(await t.plan('kickoff @Globex'));
    expect(started.project).toBe('globex');
    const snapshot = await t.vault.read();
    expect(snapshot.projects.get('globex')?.name).toBe('Globex');
  });

  test('switches from the running entry gaplessly', async () => {
    const t = await setup();
    await t.quick.start(await t.plan('auth @acme'));
    t.clock.advance({ minutes: 30 });
    const { started, stopped } = await t.quick.start(await t.plan('planning'));
    expect(started.project).toBe('acme-website');
    expect(stopped?.end).toBe(started.start);
  });

  test('trims an overlapped earlier entry on request', async () => {
    const t = await setup();
    await t.quick.start(await t.plan('auth @acme -30m'));
    await t.timer.stop();
    t.clock.advance({ minutes: 10 });
    const plan = await t.plan('call @internal -20m');
    expect(await errorCodeOf(t.quick.start(plan))).toBe('timer.backdate_overlap');
    const { started } = await t.quick.start(plan, { onConflict: 'trim' });
    expect(started.start).toBe('2026-11-08T09:50:00+02:00');
    expect((await t.day())[0]?.end).toBe('2026-11-08T09:50:00+02:00');
  });

  test('refuses text with no project to use', async () => {
    const t = await setup();
    expect(await errorCodeOf(t.quick.start(await t.plan('standup')))).toBe('input.invalid');
  });
});

describe('note', () => {
  test('adds the whole text as a note to the running entry', async () => {
    const t = await setup();
    await t.quick.start(await t.plan('auth @acme'));
    t.clock.advance({ minutes: 5 });
    const entry = await t.quick.note(await t.plan('  fixed  #123 @acme '));
    expect(entry.notes).toEqual([{ at: '2026-11-08T10:05:00+02:00', text: 'fixed #123 @acme' }]);
    expect(entry.description).toBe('auth');
  });

  test('starts an entry holding the note when nothing runs', async () => {
    const t = await setup();
    const entry = await t.quick.note(await t.plan('call with client @internal -10m'));
    expect(entry).toMatchObject({
      project: 'internal',
      description: '',
      start: '2026-11-08T09:50:00+02:00',
      notes: [{ at: '2026-11-08T10:00:00+02:00', text: 'call with client' }],
    });
  });

  test('refuses an empty note', async () => {
    const t = await setup();
    expect(await errorCodeOf(t.quick.note(await t.plan('   ')))).toBe('input.invalid');
  });
});

describe('continueRecent', () => {
  test('starts a copy of the recent item now', async () => {
    const t = await setup();
    const [item] = recentEntries([
      buildEntry({ project: 'internal', description: 'inbox zero', tags: ['admin'] }),
    ]);
    if (item === undefined) {
      throw new Error('expected a recent item');
    }
    const { started } = await t.quick.continueRecent(item);
    expect(started).toMatchObject({
      project: 'internal',
      description: 'inbox zero',
      tags: ['admin'],
      start: '2026-11-08T10:00:00+02:00',
    });
  });
});
