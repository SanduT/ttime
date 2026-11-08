import type { WeekBlock } from '@ttime/core';

import { FALLBACK_COLOR } from '../../../shared/lib/display';
import { useVaultStore } from '../../../shared/store/vault-store';
import { blockClass, blockText } from '../lib/block-text';
import { MIN_BLOCK_PX, MINUTE_PX } from '../lib/layout';

type Props = {
  readonly block: WeekBlock;
  /** Dimmed while a drag moves it. */
  readonly dragging: boolean;
  /** Keyboard activation (Enter or Space) edits it; pointer clicks go through the grid. */
  readonly onOpen: (id: string) => void;
};

/** A thin strip on the top or bottom edge that resizes the entry. */
const Edge = ({ id, edge }: { readonly id: string; readonly edge: 'start' | 'end' }) => (
  <span
    data-block={id}
    data-edge={edge}
    className={`absolute inset-x-0 h-1.5 cursor-ns-resize ${edge === 'start' ? 'top-0' : 'bottom-0'}`}
  />
);

/** An entry's part in one day: project color, description and times; edges resize. */
export const EntryBlock = ({ block, dragging, onOpen }: Props) => {
  const project = useVaultStore((state) => state.snapshot?.projects.get(block.entry.project));
  const color = project?.color ?? FALLBACK_COLOR;
  const height = Math.max((block.endMinute - block.startMinute) * MINUTE_PX, MIN_BLOCK_PX);
  const text = blockText(block, project?.name ?? block.entry.project);
  const editable = !block.running;
  return (
    <button
      type="button"
      data-block={editable ? block.entry.id : undefined}
      aria-label={text.title}
      title={text.title}
      className={`absolute overflow-hidden border-l-[3px] px-1.5 py-0.5 text-left text-xs leading-tight ${blockClass(block, dragging)}`}
      style={{
        top: block.startMinute * MINUTE_PX,
        height,
        left: `calc(${String((block.lane / block.lanes) * 100)}% + 1px)`,
        width: `calc(${String(100 / block.lanes)}% - 2px)`,
        borderLeftColor: color,
        background: `color-mix(in srgb, ${color} 22%, var(--color-surface-solid))`,
      }}
      onClick={(event) => {
        if (event.detail === 0 && editable) {
          onOpen(block.entry.id);
        }
      }}
    >
      {editable && !block.startsBefore ? <Edge id={block.entry.id} edge="start" /> : null}
      <span className="block truncate font-medium">
        {block.overlaps ? '⚠ ' : ''}
        {text.label}
      </span>
      {height >= 32 ? (
        <span className="block truncate text-(--color-text-muted) tabular-nums">{text.range}</span>
      ) : null}
      {editable && !block.endsAfter ? <Edge id={block.entry.id} edge="end" /> : null}
    </button>
  );
};
