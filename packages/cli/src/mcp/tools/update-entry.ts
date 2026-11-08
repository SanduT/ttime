import { z } from 'zod';

import { updateEntry } from '../../commands/entries';
import { defineTool } from '../tool';
import { projectId, time } from './fields';

/** `update_entry`. */
export const updateEntryTool = defineTool({
  name: 'update_entry',
  description:
    'Changes a finished entry by ID: project, description, start, end, tags or billable.',
  write: true,
  shape: {
    id: z.string().describe('Entry ID from list_entries.'),
    project: projectId.optional(),
    description: z.string().optional(),
    start: time('New start').optional(),
    end: time('New end').optional(),
    tags: z.array(z.string()).optional(),
    billable: z.boolean().optional(),
  },
  run: (ctx, { id, project, description, start, end, tags, billable }) =>
    updateEntry(ctx, id, {
      ...(project === undefined ? {} : { project }),
      ...(description === undefined ? {} : { description }),
      ...(start === undefined ? {} : { start }),
      ...(end === undefined ? {} : { end }),
      ...(tags === undefined ? {} : { tags }),
      ...(billable === undefined ? {} : { billable }),
    }),
});
