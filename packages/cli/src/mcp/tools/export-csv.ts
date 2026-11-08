import { z } from 'zod';

import { exportCsv } from '../../commands/export';
import { defineTool } from '../tool';
import { date, period, projectId } from './fields';

/** `export_csv`. */
export const exportCsvTool = defineTool({
  name: 'export_csv',
  description:
    'Writes a CSV into the vault exports/ folder and returns its path. Default last month, detailed rows and the vault rounding and CSV settings.',
  write: true,
  shape: {
    from: date('First day').optional(),
    to: date('Last day').optional(),
    period,
    project: projectId.optional(),
    mode: z.enum(['detailed', 'daily']).optional(),
    rounding: z.string().optional().describe('Like nearest:15 or none.'),
  },
  run: (ctx, args) =>
    exportCsv(ctx, {
      ...(args.from === undefined ? {} : { from: args.from }),
      ...(args.to === undefined ? {} : { to: args.to }),
      ...(args.period === undefined ? {} : { period: args.period }),
      ...(args.project === undefined ? {} : { project: args.project }),
      ...(args.mode === undefined ? {} : { mode: args.mode }),
      ...(args.rounding === undefined ? {} : { rounding: args.rounding }),
    }),
});
