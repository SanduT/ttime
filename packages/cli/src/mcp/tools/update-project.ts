import { TTimeError } from '@ttime/core';
import { z } from 'zod';

import { type ProjectResult, setArchived, updateProject } from '../../commands/projects';
import { defineTool } from '../tool';
import { projectId } from './fields';
import { PROJECT_FIELDS, projectFieldsOf } from './project-fields';

/** `update_project`, including archive and unarchive. */
export const updateProjectTool = defineTool({
  name: 'update_project',
  description:
    'Renames or changes a project, or archives (archived: true) or unarchives (archived: false) it. The ID stays.',
  write: true,
  shape: {
    project: projectId,
    name: z.string().optional(),
    archived: z.boolean().optional(),
    ...PROJECT_FIELDS,
  },
  run: async (ctx, args) => {
    const fields = projectFieldsOf(args);
    let result: ProjectResult | null = null;
    if (Object.keys(fields).length > 0) {
      result = await updateProject(ctx, args.project, fields);
    }
    if (args.archived !== undefined) {
      result = await setArchived(ctx, args.project, args.archived);
    }
    if (result === null) {
      throw new TTimeError('input.invalid', 'Pass at least one field to change.');
    }
    return result;
  },
});
