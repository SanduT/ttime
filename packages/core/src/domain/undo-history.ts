import type { Change } from '../schema/changelog';
import type { Actor } from '../schema/primitives';

/** One changelog batch: the changes of one transaction. */
export type Batch = {
  readonly batch: string;
  readonly actor: Actor;
  readonly at: string;
  readonly changes: readonly Change[];
  /** The batch this one reverted, or null for a normal change. */
  readonly undoes: string | null;
};

/** What ⌘Z and ⇧⌘Z would act on for one actor. */
export type UndoState = {
  /** The batch Undo reverts, or null. */
  readonly undo: Batch | null;
  /** The undo batch Redo reverts, or null. */
  readonly redo: Batch | null;
};

/** Groups changes (oldest first) into batches, oldest first. Pure. */
export const groupBatches = (changes: readonly Change[]): Batch[] => {
  const batches = new Map<string, Batch>();
  for (const change of changes) {
    const existing = batches.get(change.batch);
    batches.set(change.batch, {
      batch: change.batch,
      actor: change.actor,
      at: existing?.at ?? change.at,
      changes: [...(existing?.changes ?? []), change],
      undoes: existing?.undoes ?? change.undoes ?? null,
    });
  }
  return [...batches.values()];
};

const without = (stack: readonly Batch[], batch: string): Batch[] =>
  stack.filter((b) => b.batch !== batch);

/**
 * Replays `actor`'s batches (oldest first) as an undo and a redo stack. A normal batch clears
 * redo. An undo of a done batch moves it to redo; an undo of an undo batch (a redo) moves it
 * back. Pure.
 */
export const undoState = (batches: readonly Batch[], actor: Actor): UndoState => {
  let done: Batch[] = [];
  let redo: Batch[] = [];
  for (const batch of batches.filter((b) => b.actor === actor)) {
    const target = batch.undoes;
    if (target !== null && redo.some((b) => b.batch === target)) {
      redo = without(redo, target);
      done = [...done, batch];
    } else if (target !== null && done.some((b) => b.batch === target)) {
      done = without(done, target);
      redo = [...redo, batch];
    } else {
      done = [...done, batch];
      redo = [];
    }
  }
  return { undo: done.at(-1) ?? null, redo: redo.at(-1) ?? null };
};
