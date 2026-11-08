import { z } from 'zod';

import { ls } from '../../commands/ls';
import { defineTool } from '../tool';
import { date, period, projectId } from './fields';

/** `list_entries`. */
export const listEntriesTool = defineTool({
  name: 'list_entries',
  description:
    'Finished entries by start with IDs, raw times (never rounded) and notes. Default today. Use the IDs for update_entry and delete_entry.',
  write: false,
  shape: {
    from: date('First day').optional(),
    to: date('Last day, default from').optional(),
    period,
    project: projectId.optional(),
    tag: z.string().optional(),
    query: z.string().optional().describe('Text in the description or notes, case-insensitive.'),
  },
  run: (ctx, args) =>
    ls(ctx, {
      ...(args.from === undefined ? {} : { from: args.from }),
      ...(args.to === undefined ? {} : { to: args.to }),
      ...(args.period === undefined ? {} : { period: args.period }),
      ...(args.project === undefined ? {} : { project: args.project }),
      ...(args.tag === undefined ? {} : { tag: args.tag }),
      ...(args.query === undefined ? {} : { query: args.query }),
    }),
});
