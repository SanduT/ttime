import { type OnConflict, planQuickInput, recentEntries, TTimeError } from '@ttime/core';

import type { CliContext } from '../runtime/context';
import { parseTime } from './dates';
import { allEntries, type EntryView, entryView, runningView } from './views';

/** What a timer command started and stopped. */
export type TimerResult = {
  readonly started: EntryView | null;
  readonly stopped: EntryView | null;
};

/** The vault after a change, for naming projects, and the current epoch second. */
const after = async (ctx: CliContext) => ({
  snapshot: await ctx.vault.read(),
  nowEpoch: ctx.clock.now().epochMilliseconds / 1000,
});

/**
 * Starts from quick bar text (`auth review @acme -20m #dev`), stopping the running entry at the
 * same instant. `trim` shortens earlier entries a backdated start overlaps.
 */
export const start = async (ctx: CliContext, text: string, trim = false): Promise<TimerResult> => {
  const snapshot = await ctx.vault.read();
  const plan = planQuickInput(text, {
    projects: [...snapshot.projects.values()],
    running: snapshot.running,
    recent: recentEntries(allEntries(snapshot)),
  });
  if (plan.project === null) {
    throw new TTimeError(
      'input.invalid',
      'Name a project with @project, like "auth review @acme".',
    );
  }
  const onConflict: OnConflict = trim ? 'trim' : 'cancel';
  const { started, stopped } = await ctx.quick.start(plan, { onConflict });
  const latest = await after(ctx);
  const nowEpoch = latest.nowEpoch;
  const projects = new Map([...snapshot.projects, ...latest.snapshot.projects]);
  return {
    started: runningView(started, projects, nowEpoch),
    stopped: stopped === null ? null : entryView(stopped, projects),
  };
};

/** A timer start by project ID instead of quick bar text. */
export type StartInput = {
  readonly project: string;
  readonly description?: string;
  readonly start?: string;
  readonly tags?: readonly string[];
  readonly billable?: boolean;
  readonly trim?: boolean;
};

/** Starts `project` now or at `start`, stopping the running entry at that instant. */
export const startTimer = async (ctx: CliContext, input: StartInput): Promise<TimerResult> => {
  const now = ctx.clock.now();
  const { started, stopped } = await ctx.timer.start({
    project: input.project,
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.start === undefined ? {} : { start: parseTime(input.start, now) }),
    ...(input.tags === undefined ? {} : { tags: input.tags }),
    ...(input.billable === undefined ? {} : { billable: input.billable }),
    onConflict: input.trim === true ? 'trim' : 'cancel',
  });
  const { snapshot, nowEpoch } = await after(ctx);
  return {
    started: runningView(started, snapshot.projects, nowEpoch),
    stopped: stopped === null ? null : entryView(stopped, snapshot.projects),
  };
};

/** Stops the running entry now or at `at` (`17:30`, or an ISO time). */
export const stop = async (ctx: CliContext, at?: string): Promise<TimerResult> => {
  const now = ctx.clock.now();
  const stopped = await ctx.timer.stop(at === undefined ? {} : { at: parseTime(at, now) });
  const { snapshot } = await after(ctx);
  return {
    started: null,
    stopped: stopped === null ? null : entryView(stopped, snapshot.projects),
  };
};

/** Starts the last entry's project, description and tags again. */
export const resume = async (ctx: CliContext): Promise<TimerResult> => {
  const { started } = await ctx.timer.resume();
  const { snapshot, nowEpoch } = await after(ctx);
  return { started: runningView(started, snapshot.projects, nowEpoch), stopped: null };
};

/** What `note` added to. */
export type NoteResult = { readonly running: EntryView };

/** Adds a timestamped note to the running entry. */
export const note = async (ctx: CliContext, text: string): Promise<NoteResult> => {
  const running = await ctx.timer.addNote(text);
  const { snapshot, nowEpoch } = await after(ctx);
  return { running: runningView(running, snapshot.projects, nowEpoch) };
};
