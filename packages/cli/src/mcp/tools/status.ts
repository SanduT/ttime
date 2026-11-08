import { status } from '../../commands/status';
import { defineTool } from '../tool';

/** `status`: the running entry and today's and this week's totals. */
export const statusTool = defineTool({
  name: 'status',
  description:
    'The running entry (if any) and today and this week totals per project, running time included.',
  write: false,
  shape: {},
  run: (ctx) => status(ctx),
});
