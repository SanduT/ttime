import { z } from 'zod';

import { startTimer } from '../../commands/timer';
import { defineTool } from '../tool';
import { projectId, time } from './fields';

/** `start_timer`. */
export const startTimerTool = defineTool({
  name: 'start_timer',
  description:
    'Starts a timer. At most one runs: starting stops the running one at the same instant. A backdated start may not overlap earlier entries unless trim is true.',
  write: true,
  shape: {
    project: projectId,
    description: z.string().optional(),
    start: time('Start, default now').optional(),
    tags: z.array(z.string()).optional(),
    billable: z.boolean().optional(),
    trim: z.boolean().optional().describe('Shorten earlier entries a backdated start overlaps.'),
  },
  run: (ctx, { project, description, start, tags, billable, trim }) =>
    startTimer(ctx, {
      project,
      ...(description === undefined ? {} : { description }),
      ...(start === undefined ? {} : { start }),
      ...(tags === undefined ? {} : { tags }),
      ...(billable === undefined ? {} : { billable }),
      ...(trim === undefined ? {} : { trim }),
    }),
});
