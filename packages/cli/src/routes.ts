import { add } from './commands/add';
import { type Args, flag, list, type OptionSpec, required, text, words } from './commands/args';
import { doctor } from './commands/doctor';
import { exportCsv } from './commands/export';
import { ls } from './commands/ls';
import {
  createProject,
  listProjects,
  type ProjectFields,
  setArchived,
  updateProject,
} from './commands/projects';
import { report } from './commands/report';
import { status } from './commands/status';
import { note, resume, start, stop } from './commands/timer';
import { undo } from './commands/undo';
import { presentAdded, presentList, presentNote, presentTimer } from './presenters/entries';
import { presentDoctor, presentProject, presentProjects, presentUndo } from './presenters/misc';
import { presentExport, presentReport, presentStatus } from './presenters/summary';
import type { CliContext } from './runtime/context';
import { EXIT } from './runtime/handle-error';

/** A command's output: JSON data, the text form, and the exit code. */
export type Output = { readonly data: unknown; readonly text: string; readonly exit: number };

/** One CLI command. */
export type Route = {
  readonly options: OptionSpec;
  readonly run: (ctx: CliContext, args: Args) => Promise<Output>;
};

const route = <R>(
  options: OptionSpec,
  run: (ctx: CliContext, args: Args) => Promise<R>,
  present: (result: R) => string,
  exit: (result: R) => number = () => EXIT.ok,
): Route => ({
  options,
  run: async (ctx, args) => {
    const data = await run(ctx, args);
    return { data, text: present(data), exit: exit(data) };
  },
});

const S = { type: 'string' } as const;
const B = { type: 'boolean' } as const;
const RANGE = { period: S, from: S, to: S, project: S } as const;
const PROJECT_FIELDS = {
  name: S,
  client: S,
  color: S,
  rate: S,
  billable: B,
  'not-billable': B,
  'billing-period': S,
} as const;

const billableOf = (args: Args): boolean | undefined => {
  if (flag(args, 'billable')) {
    return true;
  }
  return flag(args, 'not-billable') ? false : undefined;
};

const projectFields = (args: Args): ProjectFields => {
  const period = text(args, 'billing-period');
  const billable = billableOf(args);
  return {
    ...(text(args, 'name') === undefined ? {} : { name: text(args, 'name') ?? '' }),
    ...(text(args, 'client') === undefined ? {} : { client: text(args, 'client') ?? '' }),
    ...(text(args, 'color') === undefined ? {} : { color: text(args, 'color') ?? '' }),
    ...(text(args, 'rate') === undefined ? {} : { rate: text(args, 'rate') ?? '' }),
    ...(billable === undefined ? {} : { billable }),
    ...(period === 'weekly' || period === 'monthly' ? { billingPeriod: period } : {}),
  };
};

const projects = async (ctx: CliContext, args: Args) => {
  const [action = 'list', id = ''] = args.positionals;
  switch (action) {
    case 'add':
      return createProject(ctx, { ...projectFields(args), name: required(args, 'name') });
    case 'edit':
      return updateProject(ctx, id, projectFields(args));
    case 'archive':
    case 'unarchive':
      return setArchived(ctx, id, action === 'archive');
    default:
      return listProjects(ctx, flag(args, 'all'));
  }
};

const optional = (args: Args, name: string) => {
  const value = text(args, name);
  return value === undefined ? {} : { [name]: value };
};

/** Every CLI command except `mcp` (ARCHITECTURE 8.1). */
export const ROUTES: Readonly<Record<string, Route>> = {
  status: route({}, (ctx) => status(ctx), presentStatus),
  start: route(
    { trim: B },
    (ctx, args) =>
      start(ctx, words(args, 'what to start, like "auth review @acme"'), flag(args, 'trim')),
    presentTimer,
  ),
  switch: route(
    { trim: B },
    (ctx, args) => start(ctx, words(args, 'what to switch to'), flag(args, 'trim')),
    presentTimer,
  ),
  stop: route({ at: S }, (ctx, args) => stop(ctx, text(args, 'at')), presentTimer),
  pause: route({}, (ctx) => stop(ctx), presentTimer),
  resume: route({}, (ctx) => resume(ctx), presentTimer),
  note: route({}, (ctx, args) => note(ctx, words(args, 'the note text')), presentNote),
  add: route(
    {
      project: S,
      start: S,
      end: S,
      date: S,
      duration: S,
      desc: S,
      tag: { type: 'string', multiple: true },
      billable: B,
      'not-billable': B,
    },
    (ctx, args) => {
      const billable = billableOf(args);
      const tags = list(args, 'tag');
      return add(ctx, {
        project: required(args, 'project'),
        ...optional(args, 'start'),
        ...optional(args, 'end'),
        ...optional(args, 'date'),
        ...optional(args, 'duration'),
        ...(text(args, 'desc') === undefined ? {} : { description: text(args, 'desc') ?? '' }),
        ...(tags.length === 0 ? {} : { tags }),
        ...(billable === undefined ? {} : { billable }),
      });
    },
    presentAdded,
  ),
  ls: route(
    { ...RANGE, tag: S, query: S },
    (ctx, args) =>
      ls(ctx, {
        ...optional(args, 'period'),
        ...optional(args, 'from'),
        ...optional(args, 'to'),
        ...optional(args, 'project'),
        ...optional(args, 'tag'),
        ...optional(args, 'query'),
      }),
    presentList,
  ),
  report: route(
    { ...RANGE, group: S, rounding: S },
    (ctx, args) =>
      report(ctx, {
        ...optional(args, 'period'),
        ...optional(args, 'from'),
        ...optional(args, 'to'),
        ...optional(args, 'project'),
        ...optional(args, 'group'),
        ...optional(args, 'rounding'),
      }),
    presentReport,
  ),
  export: route(
    { ...RANGE, mode: S, rounding: S },
    (ctx, args) =>
      exportCsv(ctx, {
        ...optional(args, 'period'),
        ...optional(args, 'from'),
        ...optional(args, 'to'),
        ...optional(args, 'project'),
        ...optional(args, 'mode'),
        ...optional(args, 'rounding'),
      }),
    presentExport,
  ),
  projects: route({ ...PROJECT_FIELDS, all: B }, projects, (result) =>
    'projects' in result ? presentProjects(result) : presentProject(result),
  ),
  undo: route(
    { batch: S },
    (ctx, args) => undo(ctx, { ...optional(args, 'batch'), actor: 'cli' }),
    presentUndo,
  ),
  doctor: route(
    {},
    (ctx) => doctor(ctx),
    presentDoctor,
    (result) => (result.issues.length === 0 ? EXIT.ok : EXIT.vault),
  ),
};

/** `ttime --help`. */
export const USAGE = `ttime: local-first time tracking

  ttime status
  ttime start "auth review @acme -20m #dev" [--trim]
  ttime switch "<text>"
  ttime stop [--at 17:30]
  ttime pause | resume
  ttime note "<text>"
  ttime add --project acme --start 2026-11-07T14:00 --end 16:00 --desc "auth review"
  ttime add --project acme --date yesterday --duration 2h --desc "auth review" [--tag x]
  ttime ls [--period this-week | --from yesterday --to today] [--project p --tag t --query q]
  ttime report [--period ... --from --to] [--group project|day|tag|description] [--rounding nearest:15]
  ttime export [--period last-month | --from --to] [--project p] [--mode detailed|daily]
  ttime projects [list [--all] | add --name N [--client c --rate 60 --color #hex] | edit <id> ... | archive <id> | unarchive <id>]
  ttime undo [--batch <id>]
  ttime doctor
  ttime mcp

Global: --vault <folder>  --json  --dry-run   (TTIME_VAULT, TTIME_LOG=debug)`;
