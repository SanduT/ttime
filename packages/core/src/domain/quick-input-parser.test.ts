import { describe, expect, test } from 'bun:test';
import { Temporal } from 'temporal-polyfill';

import { parseQuickInput, resolveStart } from './quick-input-parser';

describe('parseQuickInput tokens', () => {
  test('plain text is the description', () => {
    expect(parseQuickInput('  auth   refactor ')).toEqual({
      description: 'auth refactor',
      tags: [],
      start: { kind: 'now' },
    });
  });

  test('@project and #tags may appear anywhere', () => {
    expect(parseQuickInput('#backend auth @acme refactor #api #backend')).toEqual({
      description: 'auth refactor',
      projectQuery: 'acme',
      tags: ['backend', 'api'],
      start: { kind: 'now' },
    });
  });

  test('backdating accepts minutes, hours and hours with minutes', () => {
    expect(parseQuickInput('review -20m').start).toEqual({ kind: 'offset', seconds: 1200 });
    expect(parseQuickInput('review -1h').start).toEqual({ kind: 'offset', seconds: 3600 });
    expect(parseQuickInput('review -1h15').start).toEqual({ kind: 'offset', seconds: 4500 });
    expect(parseQuickInput('review -1h15m').start).toEqual({ kind: 'offset', seconds: 4500 });
    expect(parseQuickInput('review -90m').start).toEqual({ kind: 'offset', seconds: 5400 });
  });

  test('"at" with a clock time sets the start; other uses of "at" stay in the text', () => {
    expect(parseQuickInput('standup at 9:30 @acme')).toMatchObject({
      description: 'standup',
      start: { kind: 'clock', hour: 9, minute: 30 },
    });
    expect(parseQuickInput('lunch AT 14:05').start).toEqual({ kind: 'clock', hour: 14, minute: 5 });
    expect(parseQuickInput('meeting at office').description).toBe('meeting at office');
    expect(parseQuickInput('ends at 25:00').description).toBe('ends at 25:00');
  });

  test('$ and !$ force billable or non-billable', () => {
    expect(parseQuickInput('call $').billable).toBe(true);
    expect(parseQuickInput('call !$').billable).toBe(false);
    expect(parseQuickInput('call').billable).toBeUndefined();
  });
});

describe('parseQuickInput edge cases', () => {
  test('symbols inside words are text, and lone symbols are text', () => {
    expect(parseQuickInput('mail bob@acme.com about #')).toEqual({
      description: 'mail bob@acme.com about #',
      tags: [],
      start: { kind: 'now' },
    });
    expect(parseQuickInput('fix -x flag').description).toBe('fix -x flag');
  });

  test('the last project, start and billable token wins', () => {
    expect(parseQuickInput('a @one @two -5m at 9:00 $ !$')).toMatchObject({
      projectQuery: 'two',
      start: { kind: 'clock', hour: 9, minute: 0 },
      billable: false,
    });
  });

  test('an empty input has an empty description', () => {
    expect(parseQuickInput('   ').description).toBe('');
  });
});

describe('resolveStart', () => {
  const now = Temporal.ZonedDateTime.from('2026-11-08T10:42:17[Europe/Bucharest]');

  test('now, offsets and clock times', () => {
    expect(resolveStart({ kind: 'now' }, now)).toBe(now);
    expect(resolveStart({ kind: 'offset', seconds: 1200 }, now).toString()).toBe(
      '2026-11-08T10:22:17+02:00[Europe/Bucharest]',
    );
    expect(resolveStart({ kind: 'clock', hour: 9, minute: 30 }, now).toString()).toBe(
      '2026-11-08T09:30:00+02:00[Europe/Bucharest]',
    );
  });

  test('a backdate across a daylight saving change keeps real elapsed time', () => {
    const afterSpringForward = Temporal.ZonedDateTime.from('2026-03-29T04:10:00[Europe/Bucharest]');
    expect(resolveStart({ kind: 'offset', seconds: 1200 }, afterSpringForward).toString()).toBe(
      '2026-03-29T02:50:00+02:00[Europe/Bucharest]',
    );
  });
});
