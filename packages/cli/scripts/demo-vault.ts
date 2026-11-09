/**
 * Builds a demo vault for screenshots: three clients, five projects, two weeks of entries with
 * untracked gaps, and a running timer with notes. Seeded, so every run looks the same apart from
 * the dates. Writes through the core services, so the vault follows every rule.
 * Usage: bun packages/cli/scripts/demo-vault.ts <new folder>
 */
import { mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { argv } from 'node:process';

import { formatTimestamp, initVault, type Temporal } from '@ttime/core';

import { createNodeEnv } from '../src/adapters/node-env';
import { createNodeFs } from '../src/adapters/node-fs';
import { createRandomIds } from '../src/adapters/random-ids';
import { createSystemClock } from '../src/adapters/system-clock';
import { type CliContext, openContext } from '../src/runtime/context';
import { createCliLogger } from '../src/runtime/logger';
import { writeOut } from '../src/runtime/output';

const DAYS = 14;
const RUNNING_MINUTES = 47;
const DAY_START = 9 * 60;
const DAY_END = 17 * 60 + 45;
/** Today starts later and runs until shortly before the timer, so an evening run still looks like one working day. */
const TODAY_START = 10 * 60;
const MINUTES_PER_HOUR = 60;
const FIVE = 5;

type Work = {
  readonly project: string;
  readonly weight: number;
  readonly tasks: readonly string[];
  readonly tags: readonly string[];
};

const INTERNAL: Work = {
  project: 'internal',
  weight: 1,
  tasks: ['Invoices', 'Inbox and admin', 'Weekly review'],
  tags: [],
};

const WORK: readonly Work[] = [
  {
    project: 'northwind-website',
    weight: 5,
    tasks: ['Checkout redesign', 'Auth review', 'Fix cart totals on Safari', 'Release 2.4 QA'],
    tags: ['frontend', 'backend'],
  },
  {
    project: 'lumen-dashboard',
    weight: 4,
    tasks: ['Usage charts', 'Billing API integration', 'Sprint planning', 'Code review'],
    tags: ['frontend', 'meeting'],
  },
  {
    project: 'harbor-rebrand',
    weight: 3,
    tasks: ['Logo explorations', 'Brand guidelines', 'Client call', 'Website mockups'],
    tags: ['design', 'meeting'],
  },
  {
    project: 'northwind-mobile',
    weight: 2,
    tasks: ['Push notifications', 'App Store review'],
    tags: ['ios'],
  },
  INTERNAL,
];

/** A small seeded generator (mulberry32), so the demo is the same on every run. */
const seeded = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const random = seeded(7);

const pick = <T>(items: readonly T[], fallback: T): T =>
  items[Math.floor(random() * items.length)] ?? fallback;

const TOTAL_WEIGHT = WORK.reduce((sum, work) => sum + work.weight, 0);

const pickWork = (): Work => {
  let roll = random() * TOTAL_WEIGHT;
  for (const work of WORK) {
    roll -= work.weight;
    if (roll < 0) {
      return work;
    }
  }
  return INTERNAL;
};

/** A random multiple of five minutes in [min, max]. */
const fiveMinutes = (min: number, max: number): number =>
  min + FIVE * Math.floor((random() * (max - min)) / FIVE);

const at = (day: Temporal.ZonedDateTime, minutes: number): Temporal.ZonedDateTime =>
  day.with({
    hour: Math.floor(minutes / MINUTES_PER_HOUR),
    minute: minutes % MINUTES_PER_HOUR,
    second: 0,
    millisecond: 0,
    microsecond: 0,
    nanosecond: 0,
  });

const createProjects = async (context: CliContext): Promise<void> => {
  const eur = (amount: string) => ({ amount, currency: 'EUR' });
  await context.clients.create({ name: 'Northwind', defaultRate: eur('80.00') });
  await context.clients.create({ name: 'Lumen Labs', defaultRate: eur('95.00') });
  await context.clients.create({ name: 'Harbor & Co', defaultRate: eur('70.00') });
  await context.projects.create({
    name: 'Northwind Website',
    client: 'northwind',
    color: '#4F7CFF',
  });
  await context.projects.create({
    name: 'Northwind Mobile',
    client: 'northwind',
    color: '#E76F8A',
  });
  await context.projects.create({
    name: 'Lumen Dashboard',
    client: 'lumen-labs',
    color: '#2EB88A',
  });
  await context.projects.create({ name: 'Harbor Rebrand', client: 'harbor-co', color: '#F0B429' });
  await context.projects.create({ name: 'Internal', color: '#9AA0A6', billable: false });
};

/** Fills one day from `startMinutes` until `endMinutes` with entries and the occasional gap. */
const fillDay = async (
  context: CliContext,
  day: Temporal.ZonedDateTime,
  startMinutes: number,
  endMinutes: number,
): Promise<void> => {
  let cursor = startMinutes + fiveMinutes(0, 20);
  let last = '';
  while (cursor < endMinutes - 20) {
    if (random() < 0.12) {
      cursor += fiveMinutes(30, 60);
      continue;
    }
    const work = pickWork();
    const task = pick(work.tasks, '');
    if (task === last) {
      continue;
    }
    last = task;
    const end = Math.min(cursor + fiveMinutes(40, 150), endMinutes);
    await context.entries.create({
      project: work.project,
      description: task,
      tags: random() < 0.5 && work.tags.length > 0 ? [pick(work.tags, '')] : [],
      start: formatTimestamp(at(day, cursor)),
      end: formatTimestamp(at(day, end)),
    });
    cursor = end;
  }
};

const main = async (): Promise<void> => {
  const target = argv[2];
  if (target === undefined) {
    throw new Error('Usage: bun packages/cli/scripts/demo-vault.ts <new folder>');
  }
  const root = resolve(target);
  await mkdir(root, { recursive: true });
  if ((await readdir(root)).length > 0) {
    throw new Error(`${root} is not empty`);
  }
  const logger = createCliLogger('warn');
  const clock = createSystemClock();
  const env = createNodeEnv();
  const fs = createNodeFs();
  const ids = createRandomIds(clock);
  await initVault({ fs, clock, env, ids, logger, root, actor: 'cli', dryRun: false }, 'Demo');
  const context = await openContext({ vault: root, actor: 'cli', dryRun: false, logger });
  await createProjects(context);

  const now = clock.now();
  const runningStart = now.subtract({ minutes: RUNNING_MINUTES }).round({
    smallestUnit: 'minute',
    roundingMode: 'floor',
  });
  for (let back = DAYS - 1; back >= 0; back -= 1) {
    const day = now.subtract({ days: back });
    if (day.dayOfWeek > FIVE && back > 0) {
      continue;
    }
    const end =
      back === 0
        ? runningStart.hour * MINUTES_PER_HOUR + runningStart.minute - 15
        : DAY_END - fiveMinutes(0, 45);
    await fillDay(context, day, back === 0 ? TODAY_START : DAY_START, end);
  }
  await context.timer.start({
    project: 'lumen-dashboard',
    description: 'Usage charts',
    tags: ['frontend'],
    start: formatTimestamp(runningStart),
  });
  await context.timer.addNote('Switched the weekly chart to stacked bars');
  await context.timer.addNote('Tooltip shows hours and share of the week');
  writeOut(`Demo vault ready at ${root}`);
};

await main();
