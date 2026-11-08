import { z } from 'zod';

import { note } from '../../commands/timer';
import { defineTool } from '../tool';

/** `add_note`. */
export const addNoteTool = defineTool({
  name: 'add_note',
  description: 'Adds a note, stamped now, to the running entry (what was done, for invoices).',
  write: true,
  shape: { text: z.string() },
  run: (ctx, { text }) => note(ctx, text),
});
