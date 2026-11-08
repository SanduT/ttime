import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';

import type { CliContext } from '../runtime/context';
import { runTool, type ToolDeps } from './run-tool';

/** A tool ready to register on a server. */
export type Tool = {
  readonly name: string;
  readonly register: (server: McpServer, deps: ToolDeps) => void;
};

const TZ = {
  tz: z
    .string()
    .optional()
    .describe(
      'IANA time zone for times without an offset and for "today"; default the system zone.',
    ),
};
const WRITE = {
  dryRun: z.boolean().optional().describe('Return the exact changes without writing anything.'),
  confirm: z
    .boolean()
    .optional()
    .describe('Required when a write touches more than 3 records, after showing the preview.'),
};
const COMMON = z.object({ ...TZ, ...WRITE });

/** Defines a tool from its input shape and a handler that calls a command. */
export const defineTool = <S extends z.ZodRawShape>(def: {
  readonly name: string;
  readonly description: string;
  readonly write: boolean;
  readonly shape: S;
  readonly run: (ctx: CliContext, args: z.infer<z.ZodObject<S>>) => Promise<unknown>;
}): Tool => ({
  name: def.name,
  register: (server, deps) => {
    const input = z.object(def.shape);
    server.registerTool(
      def.name,
      {
        description: def.description,
        inputSchema: z.object({ ...def.shape, ...TZ, ...(def.write ? WRITE : {}) }),
        annotations: { readOnlyHint: !def.write, destructiveHint: false, openWorldHint: false },
      },
      // The SDK has validated the arguments; parse again to get typed values.
      (args: unknown) =>
        runTool(deps, def.name, COMMON.parse(args), def.write, (ctx) =>
          def.run(ctx, input.parse(args)),
        ),
    );
  },
});
