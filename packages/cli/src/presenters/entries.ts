import { clock, day, hours, table } from './format';

/** The entry fields the text output uses. */
export type EntryText = {
  readonly id: string;
  readonly projectName: string;
  readonly description: string;
  readonly start: string;
  readonly end: string | null;
  readonly seconds: number;
  readonly tags: readonly string[];
  readonly notes: readonly { readonly at: string; readonly text: string }[];
};

const label = (entry: EntryText): string => {
  const description = entry.description === '' ? '(no description)' : entry.description;
  const tags = entry.tags.map((tag) => ` #${tag}`).join('');
  return `${description} @${entry.projectName}${tags}`;
};

/** One line: `09:00-10:30  1:30  auth review @Acme Website #dev`. */
const entryLine = (entry: EntryText): string =>
  `${clock(entry.start)}-${entry.end === null ? 'now  ' : clock(entry.end)}  ${hours(entry.seconds)}  ${label(entry)}`;

/** Started, stopped or added entries. */
export const presentTimer = (result: {
  readonly started?: EntryText | null;
  readonly stopped?: EntryText | null;
}): string => {
  const lines: string[] = [];
  if (result.stopped !== undefined && result.stopped !== null) {
    lines.push(`Stopped  ${entryLine(result.stopped)}`);
  }
  if (result.started !== undefined && result.started !== null) {
    lines.push(`Started  ${label(result.started)} at ${clock(result.started.start)}`);
  }
  return lines.length === 0 ? 'Nothing changed.' : lines.join('\n');
};

/** A note added to the running entry. */
export const presentNote = (result: { readonly running: EntryText }): string => {
  const last = result.running.notes.at(-1);
  return last === undefined
    ? 'Note added.'
    : `Note at ${clock(last.at)} on ${label(result.running)}: ${last.text}`;
};

/** An added entry with its ID. */
export const presentAdded = (result: { readonly entry: EntryText }): string =>
  `Added ${day(result.entry.start)}  ${entryLine(result.entry)}  (${result.entry.id})`;

/** Entries grouped by day with the total. */
export const presentList = (result: {
  readonly from: string;
  readonly to: string;
  readonly entries: readonly EntryText[];
  readonly seconds: number;
}): string => {
  if (result.entries.length === 0) {
    return `No entries from ${result.from} to ${result.to}.`;
  }
  const lines: string[] = [];
  let current = '';
  for (const entry of result.entries) {
    if (day(entry.start) !== current) {
      current = day(entry.start);
      lines.push(lines.length === 0 ? current : `\n${current}`);
    }
    lines.push(`  ${entryLine(entry)}`);
    for (const note of entry.notes) {
      lines.push(`               ${clock(note.at)} ${note.text}`);
    }
  }
  return `${lines.join('\n')}\n\n${table([['Total', hours(result.seconds)]])}`;
};
