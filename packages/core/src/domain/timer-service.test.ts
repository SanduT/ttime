import { describe, expect, test } from 'bun:test';

import { buildDay, buildEntry } from '../testing/builders';
import { createDomainTestVault } from '../testing/domain-vault';
import { errorCodeOf } from '../testing/errors';

const DAY = 'entries/2026/11/2026-11-08.json';

const setup = async (start?: string) => {
  const tv = await createDomainTestVault(start === undefined ? {} : { start });
  return { ...tv, snapshot: () => tv.vault.read() };
};

describe('start', () => {
  test('starts now with the project billable default and clean text', async () => {
    const t = await setup();
    const { started, stopped } = await t.timer.start({
      project: 'internal',
      description: '  inbox   zero ',
      tags: ['admin', ' admin', ''],
    });
    expect(stopped).toBeNull();
    expect(started).toMatchObject({
      project: 'internal',
      description: 'inbox zero',
      tags: ['admin'],
      billable: false,
      start: '2026-11-08T10:00:00+02:00',
      createdBy: 'app',
    });
    expect((await t.snapshot()).running?.id).toBe(started.id);
    expect(await t.changelog()).toMatchObject([{ op: 'start', id: started.id, before: null }]);
  });

  test('switching stops the running entry at the same second the new one starts', async () => {
    const t = await setup();
    const first = await t.timer.start({ project: 'acme-website', description: 'auth' });
    t.clock.advance({ minutes: 30, seconds: 12, milliseconds: 700 });
    const { started, stopped } = await t.timer.switchTo({ project: 'internal' });
    expect(stopped?.id).toBe(first.started.id);
    expect(stopped?.end).toBe('2026-11-08T10:30:12+02:00');
    expect(started.start).toBe(stopped?.end ?? '');
    expect(await t.day()).toHaveLength(1);
    expect((await t.snapshot()).running?.id).toBe(started.id);
    expect(await t.changelog()).toMatchObject([{ op: 'start' }, { op: 'stop' }, { op: 'start' }]);
  });

  test('a backdated switch stops the running entry at the backdated start', async () => {
    const t = await setup();
    await t.timer.start({ project: 'acme-website' });
    t.clock.advance({ hours: 1 });
    const { stopped } = await t.timer.start({
      project: 'internal',
      start: '2026-11-08T10:40:00+02:00',
    });
    expect(stopped?.end).toBe('2026-11-08T10:40:00+02:00');
  });

  test('a switch may not start at or before the running entry started', async () => {
    const t = await setup();
    await t.timer.start({ project: 'acme-website' });
    t.clock.advance({ hours: 1 });
    try {
      await t.timer.start({ project: 'internal', start: '2026-11-08T10:00:00+02:00' });
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        code: 'timer.invalid_start',
        message:
          "Can't switch at 10:00: the running entry started at 10:00. Use a start after 10:00, or stop it first and trim.",
      });
    }
  });

  test('a start more than 60 seconds in the future is rejected', async () => {
    const t = await setup();
    expect(
      await errorCodeOf(t.timer.start({ project: 'internal', start: '2026-11-08T10:01:01+02:00' })),
    ).toBe('timer.invalid_start');
    const { started } = await t.timer.start({
      project: 'internal',
      start: '2026-11-08T10:00:30+02:00',
    });
    expect(started.start).toBe('2026-11-08T10:00:30+02:00');
  });

  test('unknown, archived and malformed input is rejected', async () => {
    const t = await setup();
    expect(await errorCodeOf(t.timer.start({ project: 'nope' }))).toBe('project.not_found');
    expect(await errorCodeOf(t.timer.start({ project: 'legacy' }))).toBe('project.archived');
    expect(await errorCodeOf(t.timer.start({ project: 'internal', start: '9:30' }))).toBe(
      'input.invalid',
    );
  });
});

describe('backdating with nothing running', () => {
  const previous = buildEntry({
    start: '2026-11-08T08:00:00+02:00',
    end: '2026-11-08T09:30:00+02:00',
  });

  test('a start after the previous entry ended is accepted', async () => {
    const t = await setup();
    await t.writeJson(DAY, buildDay('2026-11-08', [previous]));
    const { started } = await t.timer.start({
      project: 'internal',
      start: '2026-11-08T09:30:00+02:00',
    });
    expect(started.start).toBe('2026-11-08T09:30:00+02:00');
  });

  test('a start before the previous entry ended is cancelled by default', async () => {
    const t = await setup();
    await t.writeJson(DAY, buildDay('2026-11-08', [previous]));
    const before = await t.readRaw(DAY);
    try {
      await t.timer.start({ project: 'internal', start: '2026-11-08T09:00:00+02:00' });
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        code: 'timer.backdate_overlap',
        message:
          'Starting at 09:00 overlaps earlier time that ends at 09:30. Start at 09:30 or later, or trim the earlier entry.',
        details: {
          trimmable: true,
          earliestStart: '2026-11-08T09:30:00+02:00',
          conflicts: [{ id: previous.id }],
        },
      });
    }
    expect(await t.readRaw(DAY)).toBe(before);
    expect((await t.snapshot()).running).toBeNull();
  });

  test('with trim, the previous entry ends at the new start', async () => {
    const t = await setup();
    await t.writeJson(DAY, buildDay('2026-11-08', [previous]));
    await t.timer.start({
      project: 'internal',
      start: '2026-11-08T09:00:00+02:00',
      onConflict: 'trim',
    });
    expect((await t.day())[0]).toMatchObject({ id: previous.id, end: '2026-11-08T09:00:00+02:00' });
  });

  test('trimming an entry to nothing is refused', async () => {
    const t = await setup();
    await t.writeJson(DAY, buildDay('2026-11-08', [previous]));
    expect(
      await errorCodeOf(
        t.timer.start({
          project: 'internal',
          start: '2026-11-08T08:00:00+02:00',
          onConflict: 'trim',
        }),
      ),
    ).toBe('timer.backdate_overlap');
  });

  test('an entry from the previous day that crosses midnight counts as a conflict', async () => {
    const t = await setup('2026-11-08T01:00:00[Europe/Bucharest]');
    const lateNight = buildEntry({
      start: '2026-11-07T23:00:00+02:00',
      end: '2026-11-08T00:30:00+02:00',
    });
    await t.writeJson('entries/2026/11/2026-11-07.json', buildDay('2026-11-07', [lateNight]));
    expect(
      await errorCodeOf(t.timer.start({ project: 'internal', start: '2026-11-08T00:15:00+02:00' })),
    ).toBe('timer.backdate_overlap');
  });
});

describe('backdate overlap messages', () => {
  test('names the date of an overlap on another day', async () => {
    const t = await setup();
    const yesterday = buildEntry({
      start: '2026-11-07T22:00:00+02:00',
      end: '2026-11-07T23:30:00+02:00',
    });
    await t.writeJson('entries/2026/11/2026-11-07.json', buildDay('2026-11-07', [yesterday]));
    try {
      await t.timer.start({ project: 'internal', start: '2026-11-07T23:00:00+02:00' });
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        message:
          'Starting at 2026-11-07 23:00 overlaps earlier time that ends at 2026-11-07 23:30. Start at 2026-11-07 23:30 or later, or trim the earlier entry.',
      });
    }
  });
});
