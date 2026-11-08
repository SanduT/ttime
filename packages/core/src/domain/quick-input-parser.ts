import type { Temporal } from 'temporal-polyfill';

import { SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from '../lib/constants';

/** When a quick bar entry starts. */
export type StartSpec =
  | { readonly kind: 'now' }
  | { readonly kind: 'offset'; readonly seconds: number }
  | { readonly kind: 'clock'; readonly hour: number; readonly minute: number };

/** Quick bar or CLI text, split into its parts. */
export type QuickInput = {
  readonly description: string;
  readonly projectQuery?: string;
  readonly tags: readonly string[];
  readonly start: StartSpec;
  readonly billable?: boolean;
};

const PROJECT = /^@(\S+)$/;
const TAG = /^#(\S+)$/;
const BACKDATE_MINUTES = /^-(\d+)m$/;
const BACKDATE_HOURS = /^-(\d+)h(?:(\d+)m?)?$/;
const CLOCK = /^([01]?\d|2[0-3]):([0-5]\d)$/;

const backdate = (word: string): StartSpec | null => {
  const minutes = BACKDATE_MINUTES.exec(word);
  if (minutes !== null) {
    return { kind: 'offset', seconds: Number(minutes[1]) * SECONDS_PER_MINUTE };
  }
  const hours = BACKDATE_HOURS.exec(word);
  if (hours !== null) {
    const seconds =
      Number(hours[1]) * SECONDS_PER_HOUR + Number(hours[2] ?? '0') * SECONDS_PER_MINUTE;
    return { kind: 'offset', seconds };
  }
  return null;
};

type Draft = {
  readonly words: readonly string[];
  readonly tags: readonly string[];
  readonly start: StartSpec;
  readonly projectQuery?: string;
  readonly billable?: boolean;
};

/** Applies one whitespace-separated word; returns the new draft and how many words it used. */
const applyWord = (
  draft: Draft,
  word: string,
  next: string | undefined,
): { readonly draft: Draft; readonly used: number } => {
  const project = PROJECT.exec(word)?.[1];
  const tag = TAG.exec(word)?.[1];
  const offset = backdate(word);
  const clock = next === undefined ? null : CLOCK.exec(next);
  if (project !== undefined) {
    return { draft: { ...draft, projectQuery: project }, used: 1 };
  }
  if (tag !== undefined) {
    const tags = draft.tags.includes(tag) ? draft.tags : [...draft.tags, tag];
    return { draft: { ...draft, tags }, used: 1 };
  }
  if (offset !== null) {
    return { draft: { ...draft, start: offset }, used: 1 };
  }
  if (word.toLowerCase() === 'at' && clock !== null) {
    const start: StartSpec = { kind: 'clock', hour: Number(clock[1]), minute: Number(clock[2]) };
    return { draft: { ...draft, start }, used: 2 };
  }
  if (word === '$' || word === '!$') {
    return { draft: { ...draft, billable: word === '$' }, used: 1 };
  }
  return { draft: { ...draft, words: [...draft.words, word] }, used: 1 };
};

/**
 * Parses quick bar text: `@project`, `#tag`, `-20m` / `-1h` / `-1h15` / `-90m` backdating,
 * `at 9:30` clock times, `$` billable and `!$` non-billable. Tokens may appear anywhere; for
 * project, start and billable the last one wins. The rest, whitespace-normalized, is the
 * description. Pure.
 */
export const parseQuickInput = (text: string): QuickInput => {
  const all = text
    .trim()
    .split(/\s+/)
    .filter((word) => word !== '');
  let draft: Draft = { words: [], tags: [], start: { kind: 'now' } };
  for (let i = 0; i < all.length;) {
    const step = applyWord(draft, all[i] ?? '', all[i + 1]);
    draft = step.draft;
    i += step.used;
  }
  return {
    description: draft.words.join(' '),
    tags: draft.tags,
    start: draft.start,
    ...(draft.projectQuery === undefined ? {} : { projectQuery: draft.projectQuery }),
    ...(draft.billable === undefined ? {} : { billable: draft.billable }),
  };
};

/** The start time a {@link StartSpec} means at `now` (a clock time is today, in `now`'s zone). */
export const resolveStart = (
  spec: StartSpec,
  now: Temporal.ZonedDateTime,
): Temporal.ZonedDateTime => {
  switch (spec.kind) {
    case 'now':
      return now;
    case 'offset':
      return now.subtract({ seconds: spec.seconds });
    case 'clock':
      return now.with({
        hour: spec.hour,
        minute: spec.minute,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 0,
      });
  }
};
