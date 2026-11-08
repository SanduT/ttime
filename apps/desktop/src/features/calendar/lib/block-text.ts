import type { WeekBlock } from '@ttime/core';

import { clockOf } from '../../../shared/lib/display';

/** Label, time range and accessible title of a block. */
export const blockText = (block: WeekBlock, projectName: string) => {
  const label = block.entry.description === '' ? projectName : block.entry.description;
  const end = block.running ? 'now' : clockOf(block.end);
  const range = `${clockOf(block.entry.start)} – ${end}`;
  const flag = block.overlaps ? '. Overlaps another entry' : '';
  return { label, range, title: `${label}, ${range}${flag}` };
};

/** Tailwind classes for a block's corners, ring and cursor. */
export const blockClass = (block: WeekBlock, dragging: boolean): string =>
  [
    block.startsBefore ? '' : 'rounded-t-md',
    block.endsAfter ? '' : 'rounded-b-md',
    block.overlaps ? 'ring-2 ring-(--color-danger) ring-inset' : '',
    dragging ? 'opacity-40' : '',
    block.running ? 'cursor-default' : 'cursor-grab',
  ].join(' ');
