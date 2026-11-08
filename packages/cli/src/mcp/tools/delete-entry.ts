import { z } from 'zod';

import { deleteEntry, restoreEntry } from '../../commands/entries';
import { defineTool } from '../tool';

const id = z.string().describe('Entry ID from list_entries.');

/** `delete_entry`: to the trash, never hard-deleted. */
export const deleteEntryTool = defineTool({
  name: 'delete_entry',
  description:
    'Moves an entry to the vault trash. Nothing is hard-deleted; restore_entry brings it back.',
  write: true,
  shape: { id },
  run: (ctx, args) => deleteEntry(ctx, args.id),
});

/** `restore_entry`. */
export const restoreEntryTool = defineTool({
  name: 'restore_entry',
  description: 'Brings a deleted entry back from the trash.',
  write: true,
  shape: { id },
  run: (ctx, args) => restoreEntry(ctx, args.id),
});
