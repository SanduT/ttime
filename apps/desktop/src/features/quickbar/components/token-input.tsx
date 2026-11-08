import type { Project } from '@ttime/core';
import { type KeyboardEvent, type Ref, useRef } from 'react';

import { type Segment, segmentText } from '../lib/tokens';

type Props = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly projects: ReadonlyMap<string, Project>;
  readonly placeholder: string;
  /** What Enter does, shown in front of the text. */
  readonly verb: string;
  readonly inputRef: Ref<HTMLInputElement>;
};

const KIND_CLASS: Readonly<Record<Segment['kind'], string>> = {
  text: '',
  space: '',
  project: 'rounded-sm',
  tag: 'rounded-sm text-(--color-accent)',
  time: 'rounded-sm bg-(--color-control) text-(--color-text-muted)',
  billable: 'rounded-sm bg-(--color-control)',
};

/** Segments with their character offset, a stable key for each highlighted run. */
const withOffsets = (segments: readonly Segment[]) => {
  let offset = 0;
  return segments.map((segment) => {
    const keyed = { ...segment, offset };
    offset += segment.text.length;
    return keyed;
  });
};

const projectStyle = (segment: Segment, projects: ReadonlyMap<string, Project>) => {
  const color = projects.get(segment.text.slice(1).toLowerCase())?.color;
  return color === undefined ? undefined : { color, backgroundColor: `${color}26` };
};

/**
 * A text field with live token highlighting. The highlighted copy sits behind a transparent
 * input with the same font, so highlights never change the text width.
 */
export const TokenInput = ({
  value,
  onChange,
  onKeyDown,
  projects,
  placeholder,
  verb,
  inputRef,
}: Props) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const text = 'px-2 py-3 text-lg leading-7';
  return (
    <div className="flex items-center pl-4">
      <span className="shrink-0 rounded-md bg-(--color-control) px-2 py-0.5 text-xs font-medium text-(--color-text-muted)">
        {verb} ›
      </span>
      <div className="relative min-w-0 flex-1">
        <div
          ref={overlayRef}
          aria-hidden
          className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-pre ${text}`}
        >
          {withOffsets(segmentText(value)).map((segment) => (
            <span
              key={segment.offset}
              className={KIND_CLASS[segment.kind]}
              style={segment.kind === 'project' ? projectStyle(segment, projects) : undefined}
            >
              {segment.text}
            </span>
          ))}
        </div>
        <input
          ref={inputRef}
          value={value}
          placeholder={placeholder}
          aria-label="What are you working on?"
          spellCheck={false}
          autoComplete="off"
          className={`relative w-full bg-transparent text-transparent caret-(--color-text) outline-none placeholder:text-(--color-text-muted) ${text}`}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          onKeyDown={onKeyDown}
          onScroll={(event) => {
            if (overlayRef.current !== null) {
              overlayRef.current.scrollLeft = event.currentTarget.scrollLeft;
            }
          }}
        />
      </div>
    </div>
  );
};
