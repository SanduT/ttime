import { useVaultStore } from '../../../shared/store/vault-store';
import { clockOf } from '../lib/clock-input';

/** The running entry's notes, oldest first, for note mode. */
export const NotesList = () => {
  const running = useVaultStore((state) => state.snapshot?.running ?? null);
  if (running === null) {
    return (
      <p className="px-3 py-2 text-sm text-(--color-text-muted)">
        Nothing is running. A note starts an entry on the project you name with @project.
      </p>
    );
  }
  if (running.notes.length === 0) {
    return <p className="px-3 py-2 text-sm text-(--color-text-muted)">No notes yet.</p>;
  }
  return (
    <ol className="flex flex-col gap-1 px-3 py-2 text-sm">
      {running.notes.map((note) => (
        <li key={`${note.at}-${note.text}`} className="flex gap-3">
          <span className="text-(--color-text-muted) tabular-nums">{clockOf(note.at)}</span>
          <span className="min-w-0 flex-1">{note.text}</span>
        </li>
      ))}
    </ol>
  );
};
