import { join } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory';
import { buildEntry, createRecordingLogger, parseJson, SCHEMA_VERSION } from '@ttime/core';
import { afterEach, describe, expect, test } from 'bun:test';

import { createMcpServer } from '../../src/mcp/server';
import { openFixture } from './support/temp-vault';

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

/** An MCP client connected in-process to a server on a fresh basic fixture. */
const setup = async () => {
  const fixture = await openFixture('basic');
  cleanups.push(fixture.cleanup);
  const server = createMcpServer({
    vault: fixture.root,
    env: fixture.deps.env,
    logger: createRecordingLogger(),
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '1.0.0' });
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  cleanups.push(() => client.close());
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const result = await client.callTool({ name, arguments: args });
    const content = Array.isArray(result.content) ? result.content : [];
    const first: unknown = content[0];
    const text =
      typeof first === 'object' && first !== null && 'text' in first ? String(first.text) : '';
    return { isError: result.isError === true, data: parseJson(text) };
  };
  return { ...fixture, client, call };
};

describe('ttime MCP server', () => {
  test('lists every tool', async () => {
    const t = await setup();
    const { tools } = await t.client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'add_entry',
      'add_note',
      'create_project',
      'delete_entry',
      'export_csv',
      'list_entries',
      'list_projects',
      'restore_entry',
      'start_timer',
      'status',
      'stop_timer',
      'summary',
      'undo',
      'update_entry',
      'update_project',
    ]);
  });

  test('S9: add 2 hours, see them in the summary, logged as mcp with a batch', async () => {
    const t = await setup();
    const added = await t.call('add_entry', {
      project: 'acme-website',
      start: '2026-11-05T14:00',
      duration: '2h',
      description: 'auth review',
      tz: 'Europe/Bucharest',
    });
    expect(added).toMatchObject({
      isError: false,
      data: {
        result: { entry: { start: '2026-11-05T14:00:00+02:00', end: '2026-11-05T16:00:00+02:00' } },
      },
    });
    const summary = await t.call('summary', {
      from: '2026-11-05',
      to: '2026-11-05',
      groupBy: 'description',
    });
    expect(summary.data).toMatchObject({ groups: [{ label: 'auth review', seconds: 7200 }] });
    const changelog = await Bun.file(join(t.root, 'changelog', '2026-11.jsonl')).text();
    expect(changelog).toContain('"actor":"mcp"');
  });

  test('dryRun returns the changes and writes nothing; errors carry the code', async () => {
    const t = await setup();
    const dry = await t.call('create_project', { name: 'Side Project', dryRun: true });
    expect(dry.data).toMatchObject({
      dryRun: true,
      changes: [{ op: 'create', kind: 'project', id: 'side-project' }],
    });
    const listed = await t.call('list_projects');
    expect(JSON.stringify(listed.data)).not.toContain('side-project');
    const failed = await t.call('start_timer', { project: 'nope' });
    expect(failed).toMatchObject({ isError: true, data: { code: 'project.not_found' } });
  });
});

describe('ttime MCP bulk writes', () => {
  test('a write touching more than 3 records needs confirm: true', async () => {
    const t = await setup();
    const { batch } = await t.vault.transact(async (tx) => {
      const day = await tx.readDay('2026-11-04');
      const entries = [1, 2, 3, 4].map((hour) =>
        buildEntry({
          id: `0${String(hour)}JD0000000000000000000000`.slice(0, 26),
          start: `2026-11-04T0${String(hour)}:00:00+02:00`,
          end: `2026-11-04T0${String(hour)}:30:00+02:00`,
        }),
      );
      tx.writeDay({ ...day, schema: SCHEMA_VERSION, entries });
      for (const entry of entries) {
        tx.record({ op: 'create', kind: 'entry', id: entry.id, before: null, after: entry });
      }
    });
    const preview = await t.call('undo', { batch });
    expect(preview.data).toMatchObject({ needsConfirmation: true, records: 4 });
    expect((await t.vault.read()).days.get('2026-11-04')?.entries).toHaveLength(4);
    const confirmed = await t.call('undo', { batch, confirm: true });
    expect(confirmed.data).toMatchObject({ result: { undone: batch, changes: 4 } });
    expect((await t.vault.read()).days.get('2026-11-04')?.entries).toHaveLength(0);
  });
});

describe('ttime mcp over stdio', () => {
  test('answers initialize and tools/list on stdout with nothing else there', async () => {
    const fixture = await openFixture('basic');
    cleanups.push(fixture.cleanup);
    const entry = join(import.meta.dir, '..', '..', 'src', 'index.ts');
    const child = Bun.spawn(['bun', entry, 'mcp', '--vault', fixture.root], {
      env: { PATH: process.env['PATH'] ?? '', HOME: fixture.path },
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const send = (message: unknown): void => {
      void child.stdin.write(`${JSON.stringify(message)}\n`);
    };
    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 't', version: '1' },
      },
    });
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    void child.stdin.end();
    const lines = (await new Response(child.stdout).text()).trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(parseJson(lines[0] ?? '')).toMatchObject({
      id: 1,
      result: { serverInfo: { name: 'ttime' } },
    });
    expect(lines[1]).toContain('"name":"add_entry"');
    expect(await child.exited).toBe(0);
  });
});
