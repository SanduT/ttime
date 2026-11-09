import { describe, expect, test } from 'bun:test';

import { claudeCommand, mcpConfig } from './mcp-snippets';

describe('claudeCommand', () => {
  test('adds the server for every folder', () => {
    expect(claudeCommand('/Users/me/.local/bin/ttime')).toBe(
      'claude mcp add -s user ttime -- /Users/me/.local/bin/ttime mcp',
    );
  });

  test('quotes a path with spaces', () => {
    expect(claudeCommand('/Applications/My Apps/ttime')).toContain("'/Applications/My Apps/ttime'");
  });
});

describe('mcpConfig', () => {
  test('runs the CLI in MCP mode', () => {
    expect(mcpConfig('/bin/ttime')).toContain('"args": [\n        "mcp"\n      ]');
  });
});
