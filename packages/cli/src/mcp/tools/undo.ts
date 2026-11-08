import { z } from 'zod';

import { undo } from '../../commands/undo';
import { defineTool } from '../tool';

/** `undo`. */
export const undoTool = defineTool({
  name: 'undo',
  description:
    'Reverts a batch (every write result lists its batches), or the latest change made through MCP. Refused if the records were edited since.',
  write: true,
  shape: { batch: z.string().optional() },
  run: (ctx, args) =>
    undo(ctx, { ...(args.batch === undefined ? {} : { batch: args.batch }), actor: 'mcp' }),
});
