import { TTimeError } from '../lib/errors';
import { formatTimestamp, type Timestamp } from '../lib/time';
import type { ClockPort } from '../ports/clock-port';
import type { IdGenerator } from '../ports/id-port';
import type { Logger } from '../ports/logger';
import type { RunningEntry } from '../schema/entry';
import type { Vault } from '../storage/vault';
import { normalizeText } from './entry-store';
import { createProjectService } from './project-service';
import { resolveStart } from './quick-input-parser';
import type { QuickPlan } from './quick-plan';
import type { RecentEntry } from './recent-entries';
import type { OnConflict } from './running';
import { createTimerService, type StartResult } from './timer-service';

/** Dependencies of {@link createQuickActions}. */
export type QuickActionsDeps = {
  readonly vault: Vault;
  readonly clock: ClockPort;
  readonly ids: IdGenerator;
  readonly logger: Logger;
};

/** What the quick bar (and later the CLI) does with a {@link QuickPlan}. */
export type QuickActions = {
  /**
   * Starts the plan's entry (switching gaplessly), creating its project first if it is new.
   * `onConflict: 'trim'` shortens earlier entries a backdated start overlaps.
   */
  readonly start: (
    plan: QuickPlan,
    options?: { readonly onConflict?: OnConflict },
  ) => Promise<StartResult>;
  /**
   * Adds the text as a note to the running entry. With nothing running, starts an entry on
   * the plan's project and puts the text, without tokens, in its first note.
   */
  readonly note: (plan: QuickPlan) => Promise<RunningEntry>;
  /** Starts a copy of a recent item now. */
  readonly continueRecent: (item: RecentEntry) => Promise<StartResult>;
};

/** Creates the quick bar actions. */
export const createQuickActions = (deps: QuickActionsDeps): QuickActions => {
  const timer = createTimerService(deps);
  const projects = createProjectService(deps);

  const projectId = async (plan: QuickPlan): Promise<string> => {
    if (plan.project === null) {
      throw new TTimeError('input.invalid', 'Add @project to choose a project.');
    }
    if (plan.project.kind === 'existing') {
      return plan.project.project.id;
    }
    const created = await projects.create({ name: plan.project.name });
    return created.id;
  };

  const startTime = (plan: QuickPlan): Timestamp | undefined =>
    plan.input.start.kind === 'now'
      ? undefined
      : formatTimestamp(resolveStart(plan.input.start, deps.clock.now()));

  const startPlan = async (
    plan: QuickPlan,
    description: string,
    onConflict?: OnConflict,
  ): Promise<StartResult> => {
    const start = startTime(plan);
    return timer.start({
      project: await projectId(plan),
      description,
      tags: plan.input.tags,
      ...(plan.input.billable === undefined ? {} : { billable: plan.input.billable }),
      ...(start === undefined ? {} : { start }),
      ...(onConflict === undefined ? {} : { onConflict }),
    });
  };

  return {
    start: (plan, options = {}) => startPlan(plan, plan.input.description, options.onConflict),
    note: async (plan) => {
      const text = normalizeText(plan.text);
      if (text === '') {
        throw new TTimeError('input.invalid', 'Type a note first.');
      }
      if (plan.running !== null) {
        return timer.addNote(text);
      }
      await startPlan(plan, '');
      return timer.addNote(plan.input.description === '' ? text : plan.input.description);
    },
    continueRecent: (item) =>
      timer.start({
        project: item.project,
        description: item.description,
        tags: item.tags,
        billable: item.billable,
      }),
  };
};
