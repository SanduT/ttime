import { expect, test } from 'bun:test';

import { createUlidGenerator } from './id-port';
import { createManualClock } from './manual-clock';

test('the manual clock moves only when told to', async () => {
  const clock = createManualClock('2026-11-08T09:00:00[Europe/Bucharest]');
  expect(clock.now().hour).toBe(9);
  clock.advance({ minutes: 30 });
  expect(clock.now().minute).toBe(30);
  await clock.sleep(30 * 60 * 1000);
  expect(clock.now().hour).toBe(10);
  clock.set('2026-03-29T02:59:59[Europe/Bucharest]');
  expect(clock.now().offset).toBe('+02:00');
});

test('the ULID generator is timed by the clock', () => {
  const clock = createManualClock('2026-11-08T09:00:00[UTC]');
  const ids = createUlidGenerator({ clock, randomBytes: (n) => new Uint8Array(n) });
  const first = ids.newId();
  clock.advance({ seconds: 1 });
  const second = ids.newId();
  expect(second > first).toBe(true);
  expect(first).toHaveLength(26);
});
