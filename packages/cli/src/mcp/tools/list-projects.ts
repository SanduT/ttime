import { z } from 'zod';

import { listProjects } from '../../commands/projects';
import { defineTool } from '../tool';

/** `list_projects`. */
export const listProjectsTool = defineTool({
  name: 'list_projects',
  description:
    'Projects with ID (slug), name, client, rate, billable and status. Use the ID in other tools.',
  write: false,
  shape: { includeArchived: z.boolean().optional() },
  run: (ctx, args) => listProjects(ctx, args.includeArchived === true),
});
