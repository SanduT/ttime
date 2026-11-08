import { describe, expect, test } from 'bun:test';

import { createDomainTestVault } from '../testing/domain-vault';
import { errorCodeOf } from '../testing/errors';
import { createUndoService } from './undo-service';

const setup = async () => {
  const tv = await createDomainTestVault();
  const undo = createUndoService({ vault: tv.vault, logger: tv.logger });
  const running = async () => (await tv.vault.read()).running;
  const latest = async () => {
    const { undo: next } = await undo.state();
    if (next === null) {
      throw new Error('nothing to undo');
    }
    return next.batch;
  };
  return { ...tv, undo, running, latest };
};

const RANGE = { start: '2026-11-08T08:00:00+02:00', end: '2026-11-08T09:00:00+02:00' };

describe('undo', () => {
  test('undoing a create moves the entry to the trash', async () => {
    const t = await setup();
    const entry = await t.entries.create({ project: 'acme-website', ...RANGE });
    await t.undo.undo(await t.latest());
    expect(await t.day()).toEqual([]);
    expect(await t.readRaw(`.trash/entries/${entry.id}.json`)).not.toBeNull();
  });

  test('undoing a switch restores the previous running entry', async () => {
    const t = await setup();
    const { started: first } = await t.timer.start({ project: 'acme-website', description: 'a' });
    t.clock.advance({ minutes: 30 });
    await t.timer.start({ project: 'internal', description: 'b' });
    await t.undo.undo(await t.latest());
    expect((await t.running())?.id).toBe(first.id);
    expect(await t.day()).toEqual([]);
  });

  test('undoing a delete restores the entry and empties the trash', async () => {
    const t = await setup();
    const entry = await t.entries.create({ project: 'acme-website', ...RANGE });
    await t.entries.delete(entry.id);
    await t.undo.undo(await t.latest());
    expect((await t.day()).map((e) => e.id)).toEqual([entry.id]);
    expect(await t.readRaw(`.trash/entries/${entry.id}.json`)).toBeNull();
  });

  test('redo is the undo of the undo batch', async () => {
    const t = await setup();
    const entry = await t.entries.create({ project: 'acme-website', ...RANGE });
    await t.entries.update(entry.id, { description: 'renamed' });
    await t.undo.undo(await t.latest());
    expect((await t.day())[0]?.description).toBe('');
    const { redo } = await t.undo.state();
    await t.undo.undo(redo?.batch ?? '');
    expect((await t.day())[0]?.description).toBe('renamed');
    expect((await t.undo.state()).redo).toBeNull();
  });

  test('records the revert as a new batch that names what it undid', async () => {
    const t = await setup();
    await t.entries.create({ project: 'acme-website', ...RANGE });
    const target = await t.latest();
    await t.undo.undo(target);
    const [newest] = await t.undo.history();
    expect(newest).toMatchObject({ undoes: target, actor: 'app' });
    expect(newest?.changes[0]).toMatchObject({ op: 'delete', after: null });
  });

  test('refuses when the record changed since', async () => {
    const t = await setup();
    const entry = await t.entries.create({ project: 'acme-website', ...RANGE });
    const target = await t.latest();
    await t.entries.update(entry.id, { description: 'later edit' });
    expect(await errorCodeOf(t.undo.undo(target))).toBe('undo.conflict');
    expect((await t.day())[0]?.description).toBe('later edit');
  });

  test('undoing a project create archives it', async () => {
    const t = await setup();
    await t.projects.create({ name: 'Side gig' });
    await t.undo.undo(await t.latest());
    expect((await t.vault.read()).projects.get('side-gig')?.status).toBe('archived');
  });

  test('an unknown batch is not found', async () => {
    const t = await setup();
    expect(await errorCodeOf(t.undo.undo('01JC9A00000000000000000000'))).toBe('undo.not_found');
  });
});

describe('undo across records and days', () => {
  test('undoing a stop makes the entry run again', async () => {
    const t = await setup();
    const { started } = await t.timer.start({ project: 'acme-website' });
    t.clock.advance({ minutes: 20 });
    await t.timer.stop();
    await t.undo.undo(await t.latest());
    expect((await t.running())?.id).toBe(started.id);
    expect(await t.day()).toEqual([]);
  });

  test('undoing a stop refuses while another entry runs', async () => {
    const t = await setup();
    await t.timer.start({ project: 'acme-website' });
    t.clock.advance({ minutes: 20 });
    await t.timer.stop();
    const stopBatch = await t.latest();
    t.clock.advance({ minutes: 5 });
    await t.timer.start({ project: 'internal' });
    expect(await errorCodeOf(t.undo.undo(stopBatch))).toBe('undo.conflict');
  });

  test('undoing a move to another day puts the entry back in its day file', async () => {
    const t = await setup();
    const entry = await t.entries.create({ project: 'acme-website', ...RANGE });
    await t.entries.move(entry.id, '2026-11-07T08:00:00+02:00');
    await t.undo.undo(await t.latest());
    expect((await t.day()).map((e) => e.id)).toEqual([entry.id]);
    expect(await t.day('2026-11-07')).toEqual([]);
  });

  test('undoes project and client edits, and archives a created client', async () => {
    const t = await setup();
    await t.projects.update('internal', { name: 'Ops' });
    await t.undo.undo(await t.latest());
    await t.clients.update('acme', { name: 'Acme Inc' });
    await t.undo.undo(await t.latest());
    await t.clients.create({ name: 'Globex' });
    await t.undo.undo(await t.latest());
    const snapshot = await t.vault.read();
    expect(snapshot.projects.get('internal')?.name).toBe('Internal');
    expect(snapshot.clients.get('acme')?.name).toBe('Acme GmbH');
    expect(snapshot.clients.get('globex')?.archived).toBe(true);
  });
});
