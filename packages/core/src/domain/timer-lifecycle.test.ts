import { describe, expect, test } from 'bun:test';

import { parseJson } from '../lib/json';
import { buildDay, buildEntry, buildRunning } from '../testing/builders';
import { createDomainTestVault } from '../testing/domain-vault';
import { errorCodeOf } from '../testing/errors';

const DAY = 'entries/2026/11/2026-11-08.json';

const setup = async (start?: string) => {
  const tv = await createDomainTestVault(start === undefined ? {} : { start });
  return { ...tv, snapshot: () => tv.vault.read() };
};

describe('stop and pause', () => {
  test('stop writes the day file of the start date and clears running.json', async () => {
    const t = await setup('2026-11-07T23:30:00[Europe/Bucharest]');
    const { started } = await t.timer.start({ project: 'acme-website' });
    t.clock.advance({ hours: 1 });
    const entry = await t.timer.stop();
    expect(entry).toMatchObject({ id: started.id, end: '2026-11-08T00:30:00+02:00' });
    expect((await t.day('2026-11-07')).map((e) => e.id)).toEqual([started.id]);
    expect((await t.snapshot()).running).toBeNull();
  });

  test('a stop that crashed after the day file write is completed by the next stop', async () => {
    const t = await setup();
    const { started } = await t.timer.start({ project: 'acme-website' });
    t.clock.advance({ minutes: 10 });
    t.fs.failNext('writeAtomic', 'running.json');
    expect(await errorCodeOf(t.timer.stop())).toBe('io.failed');
    expect((await t.day()).map((e) => e.id)).toEqual([started.id]);
    expect((await t.snapshot()).running).toBeNull();
    const completed = await t.timer.stop();
    expect(completed?.end).toBe('2026-11-08T10:10:00+02:00');
    expect(await t.readRaw('running.json')).toContain('"entry": null');
  });

  test('stopping at the start second discards the zero-length entry', async () => {
    const t = await setup();
    await t.timer.start({ project: 'acme-website' });
    expect(await t.timer.stop()).toBeNull();
    expect(await t.day()).toEqual([]);
    expect((await t.changelog()).at(-1)).toMatchObject({ op: 'stop', after: null });
  });

  test('stop at an explicit time, never before the start or in the future', async () => {
    const t = await setup();
    await t.timer.start({ project: 'acme-website' });
    t.clock.advance({ hours: 2 });
    expect(await errorCodeOf(t.timer.stop({ at: '2026-11-08T09:59:59+02:00' }))).toBe(
      'timer.invalid_end',
    );
    expect(await errorCodeOf(t.timer.stop({ at: '2026-11-08T12:05:00+02:00' }))).toBe(
      'timer.invalid_end',
    );
    expect((await t.timer.stop({ at: '2026-11-08T11:00:00+02:00' }))?.end).toBe(
      '2026-11-08T11:00:00+02:00',
    );
  });

  test('stop with nothing running fails', async () => {
    const t = await setup();
    expect(await errorCodeOf(t.timer.stop())).toBe('timer.not_running');
  });

  test('an entry running across the autumn clock change keeps both offsets', async () => {
    const t = await setup('2026-10-25T03:30:00+03:00[Europe/Bucharest]');
    await t.timer.start({ project: 'acme-website' });
    t.clock.advance({ hours: 1 });
    const entry = await t.timer.pause();
    expect(entry).toMatchObject({
      start: '2026-10-25T03:30:00+03:00',
      end: '2026-10-25T03:30:00+02:00',
    });
    expect(await t.day('2026-10-25')).toHaveLength(1);
  });
});

describe('resume', () => {
  test('resume starts a new entry copying the last one', async () => {
    const t = await setup();
    await t.timer.start({
      project: 'acme-website',
      description: 'auth',
      tags: ['api'],
      billable: false,
    });
    t.clock.advance({ minutes: 20 });
    const paused = await t.timer.pause();
    t.clock.advance({ minutes: 15 });
    const { started } = await t.timer.resume();
    expect(started.id).not.toBe(paused?.id ?? '');
    expect(started).toMatchObject({
      project: 'acme-website',
      description: 'auth',
      tags: ['api'],
      billable: false,
      start: '2026-11-08T10:35:00+02:00',
    });
  });

  test('resume copies the entry that ended last on the newest day', async () => {
    const t = await setup();
    await t.writeJson(
      DAY,
      buildDay('2026-11-08', [
        buildEntry({
          description: 'later',
          start: '2026-11-08T08:00:00+02:00',
          end: '2026-11-08T09:30:00+02:00',
        }),
        buildEntry({
          description: 'earlier',
          start: '2026-11-08T08:30:00+02:00',
          end: '2026-11-08T09:00:00+02:00',
        }),
      ]),
    );
    await t.writeJson('entries/2026/11/2026-11-09.json', buildDay('2026-11-09', []));
    expect((await t.timer.resume()).started.description).toBe('later');
  });

  test('resume needs a previous entry and nothing running', async () => {
    const t = await setup();
    expect(await errorCodeOf(t.timer.resume())).toBe('entry.not_found');
    await t.timer.start({ project: 'internal' });
    expect(await errorCodeOf(t.timer.resume())).toBe('timer.already_running');
  });
});

describe('notes, discard and edits', () => {
  test('addNote appends a timestamped note to the running entry', async () => {
    const t = await setup();
    await t.timer.start({ project: 'acme-website' });
    t.clock.advance({ minutes: 42 });
    const entry = await t.timer.addNote(' finished  login flow ');
    expect(entry.notes).toEqual([{ at: '2026-11-08T10:42:00+02:00', text: 'finished login flow' }]);
    expect(await errorCodeOf(t.timer.addNote('  '))).toBe('input.invalid');
  });

  test('addNote with nothing running fails', async () => {
    const t = await setup();
    expect(await errorCodeOf(t.timer.addNote('x'))).toBe('timer.not_running');
  });

  test('discard moves the running entry to the trash', async () => {
    const t = await setup();
    const { started } = await t.timer.start({ project: 'acme-website' });
    t.clock.advance({ minutes: 5 });
    await t.timer.discard();
    expect((await t.snapshot()).running).toBeNull();
    expect(await t.day()).toEqual([]);
    expect(parseJson((await t.readRaw(`.trash/entries/${started.id}.json`)) ?? '')).toMatchObject({
      deletedBy: 'app',
      entry: { id: started.id, end: '2026-11-08T10:05:00+02:00' },
    });
  });

  test('discarding a zero-length entry leaves only the changelog line', async () => {
    const t = await setup();
    const { started } = await t.timer.start({ project: 'acme-website' });
    await t.timer.discard();
    expect(await t.readRaw(`.trash/entries/${started.id}.json`)).toBeNull();
    expect((await t.changelog()).at(-1)).toMatchObject({ op: 'delete', id: started.id });
  });

  test('editRunning changes fields and checks a new start like a backdate', async () => {
    const t = await setup();
    await t.writeJson(
      DAY,
      buildDay('2026-11-08', [
        buildEntry({ start: '2026-11-08T08:00:00+02:00', end: '2026-11-08T09:00:00+02:00' }),
      ]),
    );
    await t.timer.start({ project: 'acme-website' });
    const edited = await t.timer.editRunning({
      project: 'internal',
      description: 'review',
      tags: ['x'],
      billable: true,
      start: '2026-11-08T09:10:00+02:00',
    });
    expect(edited).toMatchObject({
      project: 'internal',
      description: 'review',
      start: '2026-11-08T09:10:00+02:00',
    });
    expect(await errorCodeOf(t.timer.editRunning({ start: '2026-11-08T08:30:00+02:00' }))).toBe(
      'timer.backdate_overlap',
    );
    expect(await errorCodeOf(t.timer.editRunning({ project: 'legacy' }))).toBe('project.archived');
  });

  test('unknown keys on the running entry survive a stop', async () => {
    const t = await setup();
    await t.writeJson('running.json', {
      schema: 1,
      entry: { ...buildRunning(), source: 'shortcuts' },
    });
    t.clock.advance({ minutes: 1 });
    expect(await t.timer.stop()).toMatchObject({ source: 'shortcuts' });
  });
});
