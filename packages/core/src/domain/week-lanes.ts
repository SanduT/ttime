/** A span of minutes in one day, to lay out side by side when spans overlap. */
export type Span = { readonly startMinute: number; readonly endMinute: number };

/** Where a span sits among its overlapping neighbours. */
export type Lane = {
  /** Zero-based column within its group of overlapping spans. */
  readonly lane: number;
  /** Columns in that group. */
  readonly lanes: number;
  /** True when the span shares time with another span. */
  readonly overlaps: boolean;
};

const intersects = (a: Span, b: Span): boolean =>
  a.startMinute < b.endMinute && b.startMinute < a.endMinute;

/**
 * Lanes for `spans` (sorted by start): each span takes the first column free at its start; a
 * group of chained overlaps shares one column count. Returned in input order. Pure.
 */
export const layoutLanes = (spans: readonly Span[]): Lane[] => {
  const lanes: number[] = [];
  const counts: number[] = [];
  let group: number[] = [];
  let groupEnd = -Infinity;
  let columnEnds: number[] = [];
  const close = () => {
    const width = columnEnds.length;
    for (const index of group) {
      counts[index] = width;
    }
    group = [];
    columnEnds = [];
  };
  spans.forEach((span, index) => {
    if (span.startMinute >= groupEnd) {
      close();
    }
    const free = columnEnds.findIndex((end) => end <= span.startMinute);
    const lane = free === -1 ? columnEnds.length : free;
    columnEnds[lane] = span.endMinute;
    lanes[index] = lane;
    group.push(index);
    groupEnd = Math.max(span.startMinute >= groupEnd ? -Infinity : groupEnd, span.endMinute);
  });
  close();
  return spans.map((span, index) => ({
    lane: lanes[index] ?? 0,
    lanes: counts[index] ?? 1,
    overlaps: spans.some((other, j) => j !== index && intersects(span, other)),
  }));
};
