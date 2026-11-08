import { z } from 'zod';

import { report } from '../../commands/report';
import { defineTool } from '../tool';
import { date, period, projectId } from './fields';

/** `summary`. */
export const summaryTool = defineTool({
  name: 'summary',
  description:
    'Hours, billable hours and amounts for a range grouped by project, day, tag or description. Default this week and the vault rounding; by project or day it matches a CSV export. The running entry is not included (see status).',
  write: false,
  shape: {
    from: date('First day').optional(),
    to: date('Last day').optional(),
    period,
    groupBy: z.enum(['project', 'day', 'tag', 'description']).optional(),
    project: projectId.optional(),
    rounding: z
      .string()
      .optional()
      .describe('Like nearest:15, up:6, up:15:day or none. Default the vault setting.'),
  },
  run: (ctx, args) =>
    report(ctx, {
      ...(args.from === undefined ? {} : { from: args.from }),
      ...(args.to === undefined ? {} : { to: args.to }),
      ...(args.period === undefined ? {} : { period: args.period }),
      ...(args.groupBy === undefined ? {} : { group: args.groupBy }),
      ...(args.project === undefined ? {} : { project: args.project }),
      ...(args.rounding === undefined ? {} : { rounding: args.rounding }),
    }),
});
