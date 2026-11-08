import { join } from 'node:path';

import { parseJson } from '@ttime/core';
import { afterEach, describe, expect, test } from 'bun:test';

import { openFixture } from './support/temp-vault';

const ENTRY = join(import.meta.dir, '..', '..', 'src', 'index.ts');
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

/** Runs the CLI as a subprocess on a fresh copy of the basic fixture, HOME inside the temp dir. */
const setup = async () => {
  const fixture = await openFixture('basic');
  cleanups.push(fixture.cleanup);
  const run = async (...args: string[]) => {
    const child = Bun.spawn(['bun', ENTRY, ...args, '--vault', fixture.root], {
      env: { PATH: process.env['PATH'] ?? '', HOME: fixture.path, TZ: 'Europe/Bucharest' },
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    return { stdout, stderr, code };
  };
  return { ...fixture, run };
};

describe('ttime CLI end to end', () => {
  test('add, list and report an entry; the changelog records the CLI', async () => {
    const t = await setup();
    const added = await t.run(
      'add',
      '--project',
      'acme-website',
      '--start',
      '2026-11-05T14:00',
      '--end',
      '16:00',
      '--desc',
      'auth review',
      '--json',
    );
    expect(added.code).toBe(0);
    const entry = parseJson(added.stdout);
    expect(entry).toMatchObject({
      entry: {
        start: '2026-11-05T14:00:00+02:00',
        end: '2026-11-05T16:00:00+02:00',
        seconds: 7200,
      },
    });

    const listed = await t.run('ls', '--from', '2026-11-05');
    expect(listed.stdout).toContain('14:00-16:00  2:00  auth review @Acme Website');

    const report = await t.run(
      'report',
      '--from',
      '2026-11-05',
      '--group',
      'description',
      '--json',
    );
    expect(parseJson(report.stdout)).toMatchObject({
      groups: [{ label: 'auth review', seconds: 7200 }],
    });

    const changelog = await Bun.file(join(t.root, 'changelog', '2026-11.jsonl')).text();
    expect(changelog).toContain('"actor":"cli"');
  });

  test('start, status, note and stop', async () => {
    const t = await setup();
    const started = await t.run('start', 'kickoff @acme-website -10m');
    expect(started.code).toBe(0);
    expect(started.stdout).toContain('Started  kickoff @Acme Website');
    expect((await t.run('status')).stdout).toContain('Running  kickoff @Acme Website');
    expect((await t.run('note', 'agenda sent')).stdout).toContain('agenda sent');
    const stopped = await t.run('stop');
    expect(stopped.stdout).toContain('Stopped');
    expect((await t.run('status')).stdout).toContain('Nothing running.');
  });
});

describe('ttime CLI safety and output', () => {
  test('dry run writes nothing; undo reverts the last CLI change', async () => {
    const t = await setup();
    const dry = await t.run('projects', 'add', '--name', 'Side Project', '--dry-run');
    expect(dry.stdout).toContain('create project side-project');
    expect((await t.run('projects')).stdout).not.toContain('side-project');

    await t.run('projects', 'add', '--name', 'Side Project', '--rate', '40');
    expect((await t.run('projects')).stdout).toContain('40.00 EUR');
    const undone = await t.run('undo');
    expect(undone.stdout).toContain('Undid 1 change');
    expect((await t.run('projects')).stdout).not.toContain('side-project');
  });

  test('exit codes: 1 for bad input, 2 for vault problems, 0 for a clean doctor', async () => {
    const t = await setup();
    const bad = await t.run(
      'add',
      '--project',
      'acme-website',
      '--date',
      'someday',
      '--duration',
      '1h',
    );
    expect(bad.code).toBe(1);
    expect(bad.stderr).toContain('Use a date like');
    expect((await t.run('doctor')).code).toBe(0);
    const missing = Bun.spawn(['bun', ENTRY, 'status', '--vault', join(t.path, 'nowhere')], {
      stderr: 'pipe',
      env: { PATH: process.env['PATH'] ?? '', HOME: t.path },
    });
    expect(await missing.exited).toBe(2);
  });

  test('export writes a CSV into the vault', async () => {
    const t = await setup();
    const result = await t.run('export', '--from', '2026-11-01', '--to', '2026-11-30');
    const path = result.stdout.trim().split('\n').at(-1) ?? '';
    expect(path.startsWith(join(t.root, 'exports'))).toBe(true);
    expect(await Bun.file(path).text()).toContain('date,start,end');
  });
});
