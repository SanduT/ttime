/** Shell-quotes `path` when it has characters a shell would split or expand. */
const quoted = (path: string): string => (/^[\w./-]+$/u.test(path) ? path : `'${path}'`);

/** The Claude Code command that adds the ttime MCP server for every folder. */
export const claudeCommand = (cli: string): string =>
  `claude mcp add -s user ttime -- ${quoted(cli)} mcp`;

/** The `mcpServers` entry other MCP clients (Claude Desktop, Cursor and others) expect. */
export const mcpConfig = (cli: string): string =>
  `${JSON.stringify({ mcpServers: { ttime: { command: cli, args: ['mcp'] } } }, null, 2)}\n`;
