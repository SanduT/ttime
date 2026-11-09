import { stdin } from 'node:process';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';

import type { ToolDeps } from './run-tool';
import type { Tool } from './tool';
import { addEntryTool } from './tools/add-entry';
import { addNoteTool } from './tools/add-note';
import { createProjectTool } from './tools/create-project';
import { deleteEntryTool, restoreEntryTool } from './tools/delete-entry';
import { exportCsvTool } from './tools/export-csv';
import { listEntriesTool } from './tools/list-entries';
import { listProjectsTool } from './tools/list-projects';
import { startTimerTool } from './tools/start-timer';
import { statusTool } from './tools/status';
import { stopTimerTool } from './tools/stop-timer';
import { summaryTool } from './tools/summary';
import { undoTool } from './tools/undo';
import { updateEntryTool } from './tools/update-entry';
import { updateProjectTool } from './tools/update-project';

/** Every tool (ARCHITECTURE 8.2). */
const TOOLS: readonly Tool[] = [
  statusTool,
  listProjectsTool,
  createProjectTool,
  updateProjectTool,
  startTimerTool,
  stopTimerTool,
  addNoteTool,
  listEntriesTool,
  addEntryTool,
  updateEntryTool,
  deleteEntryTool,
  restoreEntryTool,
  summaryTool,
  exportCsvTool,
  undoTool,
];

const INSTRUCTIONS = `ttime is a local time tracker whose data is plain JSON files in a vault folder.
- At most one timer runs; starting one stops the running one at the same instant.
- Times are stored to the second; rounding applies only in summary and export_csv.
- Project IDs are immutable slugs (acme-website); use list_projects to find them.
- Resolve relative dates ("yesterday afternoon") yourself and pass ISO 8601 times with an offset, or local times with tz.
- Every write accepts dryRun. A write touching more than 3 records returns a preview; show it to the user and repeat with confirm: true.
- Nothing is hard-deleted. Every write result lists its batches, which undo can revert.`;

/** The ttime MCP server with every tool registered. */
export const createMcpServer = (deps: ToolDeps): McpServer => {
  const server = new McpServer({ name: 'ttime', version: '0.2.0' }, { instructions: INSTRUCTIONS });
  for (const tool of TOOLS) {
    tool.register(server, deps);
  }
  return server;
};

/** Serves MCP on stdin and stdout until the client disconnects. Nothing else writes stdout. */
export const serveStdio = async (deps: ToolDeps): Promise<void> => {
  const server = createMcpServer(deps);
  const transport = new StdioServerTransport();
  const closed = new Promise<void>((resolve) => {
    transport.onclose = resolve;
  });
  await server.connect(transport);
  // The client closing stdin ends the session.
  stdin.once('end', () => {
    void server.close();
  });
  await closed;
};
