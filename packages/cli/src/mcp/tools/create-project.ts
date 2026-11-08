import { z } from 'zod';

import { createProject } from '../../commands/projects';
import { defineTool } from '../tool';
import { PROJECT_FIELDS, projectFieldsOf } from './project-fields';

/** `create_project`. */
export const createProjectTool = defineTool({
  name: 'create_project',
  description: 'Creates a project. Its ID is a slug of the name and never changes.',
  write: true,
  shape: { name: z.string(), ...PROJECT_FIELDS },
  run: (ctx, args) => createProject(ctx, { ...projectFieldsOf(args), name: args.name }),
});
