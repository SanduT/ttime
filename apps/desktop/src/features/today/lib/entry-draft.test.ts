import { buildEntry } from '@ttime/core';
import { describe, expect, test } from 'bun:test';

import { draftOf, rangeOf } from './entry-draft';

const ZONE = 'Europe/Bucharest';
const draft = (start: string, end: string) => ({ description: '', project: 'p', start, end });

describe('entry drafts', () => {
  test('draftOf shows wall-clock times', () => {
    const entry = buildEntry({
      start: '2026-11-08T09:00:00+02:00',
      end: '2026-11-08T10:30:00+02:00',
    });
    expect(draftOf(entry)).toMatchObject({ start: '09:00', end: '10:30' });
  });

  test('rangeOf reads times on the date', () => {
    expect(rangeOf(draft('9:00', '10:30'), '2026-11-08', ZONE)).toEqual({
      ok: true,
      start: '2026-11-08T09:00:00+02:00',
      end: '2026-11-08T10:30:00+02:00',
    });
  });

  test('an end before the start is on the next day', () => {
    expect(rangeOf(draft('22:00', '01:00'), '2026-11-08', ZONE)).toMatchObject({
      end: '2026-11-09T01:00:00+02:00',
    });
  });

  test('explains bad times', () => {
    expect(rangeOf(draft('x', '10:00'), '2026-11-08', ZONE)).toMatchObject({ ok: false });
    expect(rangeOf(draft('09:00', 'y'), '2026-11-08', ZONE)).toMatchObject({ ok: false });
  });
});
