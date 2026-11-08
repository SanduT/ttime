/** How a piece of quick bar text is highlighted. */
type SegmentKind = 'text' | 'space' | 'project' | 'tag' | 'time' | 'billable';

/** A run of quick bar text with its highlight kind. Concatenating `text` gives the input. */
export type Segment = { readonly text: string; readonly kind: SegmentKind };

const BACKDATE = /^-\d+(?:m|h(?:\d+m?)?)$/;
const CLOCK = /^([01]?\d|2[0-3]):[0-5]\d$/;

const kindOf = (
  word: string,
  next: string | undefined,
  previous: string | undefined,
): SegmentKind => {
  if (/^@\S+$/.test(word)) {
    return 'project';
  }
  if (/^#\S+$/.test(word)) {
    return 'tag';
  }
  if (BACKDATE.test(word)) {
    return 'time';
  }
  if (word.toLowerCase() === 'at' && next !== undefined && CLOCK.test(next)) {
    return 'time';
  }
  if (previous?.toLowerCase() === 'at' && CLOCK.test(word)) {
    return 'time';
  }
  return word === '$' || word === '!$' ? 'billable' : 'text';
};

/** Splits quick bar text into highlightable runs, mirroring the core parser's tokens. */
export const segmentText = (text: string): Segment[] => {
  const parts = text.split(/(\s+)/).filter((part) => part !== '');
  const words = parts.filter((part) => !/^\s+$/.test(part));
  let index = 0;
  return parts.map((part) => {
    if (/^\s+$/.test(part)) {
      return { text: part, kind: 'space' };
    }
    const kind = kindOf(part, words[index + 1], words[index - 1]);
    index += 1;
    return { text: part, kind };
  });
};

/** The `@query` being typed at the end of `text` (possibly empty), or null. */
export const projectQueryAtEnd = (text: string): string | null => {
  const match = /(?:^|\s)@(\S*)$/.exec(text);
  return match === null ? null : (match[1] ?? '');
};

/** Replaces the `@query` at the end of `text` with `@slug` and a space. */
export const completeProject = (text: string, slug: string): string =>
  text.replace(/@\S*$/, `@${slug} `);
