import type { Note } from '@ttime/core';

import { clockOf } from '../../../shared/lib/display';

/** An entry's notes with their times. */
export const Notes = ({ notes }: { readonly notes: readonly Note[] }) =>
  notes.length === 0 ? null : (
    <ol className="mt-1 flex flex-col gap-0.5 pl-5 text-xs text-(--color-text-muted)">
      {notes.map((note) => (
        <li key={`${note.at}-${note.text}`} className="flex gap-2">
          <span className="tabular-nums">{clockOf(note.at)}</span>
          <span>{note.text}</span>
        </li>
      ))}
    </ol>
  );
