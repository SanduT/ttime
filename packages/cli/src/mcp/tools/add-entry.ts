import { z } from 'zod';

import { add } from '../../commands/add';
import { defineTool } from '../tool';
import { projectId, time } from './fields';

/** `add_entry`. */
export const addEntryTool = defineTool({
  name: 'add_entry',
  description:
    'Adds a finished entry from start and end, or start and duration. Times are stored to the second; rounding happens only in reports and exports.',
  write: true,
  shape: {
    project: projectId,
    start: time('Start'),
    end: time('End').optional(),
    duration: z.string().optional().describe('Instead of end: 2h, 90m, 1h30m or 1.5h.'),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    billable: z.boolean().optional(),
  },
  run: (ctx, args) =>
    add(ctx, {
      project: args.project,
      start: args.start,
      ...(args.end === undefined ? {} : { end: args.end }),
      ...(args.duration === undefined ? {} : { duration: args.duration }),
      ...(args.description === undefined ? {} : { description: args.description }),
      ...(args.tags === undefined ? {} : { tags: args.tags }),
      ...(args.billable === undefined ? {} : { billable: args.billable }),
    }),
});
