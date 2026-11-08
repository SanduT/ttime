import { type Money, parseAmount, type Project, type ProjectPatch } from '@ttime/core';

import type { CliContext } from '../runtime/context';
import { type ProjectView, projectView } from './views';

/** Project fields for create and update. `rate` is `60` or `60.00 EUR`; `none` clears it. */
export type ProjectFields = {
  readonly name?: string;
  readonly client?: string;
  readonly color?: string;
  readonly rate?: string;
  readonly billable?: boolean;
  readonly billingPeriod?: Project['billingPeriod'];
};

/** One project. */
export type ProjectResult = { readonly project: ProjectView };
/** Every project, active first. */
export type ProjectsResult = { readonly projects: readonly ProjectView[] };

const moneyOf = (rate: string, currency: string): Money => {
  const [amount = '', code] = rate.trim().split(/\s+/);
  return { amount: parseAmount(amount), currency: (code ?? currency).toUpperCase() };
};

const currencyOf = async (ctx: CliContext): Promise<string> =>
  (await ctx.vault.read()).config?.settings.defaultCurrency ?? 'EUR';

/** Lists projects; archived ones only with `all`. */
export const listProjects = async (ctx: CliContext, all = false): Promise<ProjectsResult> => {
  const snapshot = await ctx.vault.read();
  const projects = [...snapshot.projects.values()]
    .filter((project) => all || project.status === 'active')
    .sort((a, b) => a.status.localeCompare(b.status) || a.name.localeCompare(b.name))
    .map(projectView);
  return { projects };
};

/** Creates a project; its ID is a slug of the name. */
export const createProject = async (
  ctx: CliContext,
  fields: ProjectFields & { readonly name: string },
): Promise<ProjectResult> => {
  const currency = await currencyOf(ctx);
  const project = await ctx.projects.create({
    name: fields.name,
    ...(fields.client === undefined ? {} : { client: fields.client }),
    ...(fields.color === undefined ? {} : { color: fields.color }),
    ...(fields.billable === undefined ? {} : { billable: fields.billable }),
    ...(fields.billingPeriod === undefined ? {} : { billingPeriod: fields.billingPeriod }),
    ...(fields.rate === undefined ? {} : { rate: moneyOf(fields.rate, currency) }),
  });
  return { project: projectView(project) };
};

/** Changes a project. `client` or `rate` set to `none` removes it. */
export const updateProject = async (
  ctx: CliContext,
  id: string,
  fields: ProjectFields,
): Promise<ProjectResult> => {
  const currency = await currencyOf(ctx);
  const clear = (value: string): string | null => (value === 'none' ? null : value);
  const patch: ProjectPatch = {
    ...(fields.name === undefined ? {} : { name: fields.name }),
    ...(fields.color === undefined ? {} : { color: fields.color }),
    ...(fields.billable === undefined ? {} : { billable: fields.billable }),
    ...(fields.billingPeriod === undefined ? {} : { billingPeriod: fields.billingPeriod }),
    ...(fields.client === undefined ? {} : { client: clear(fields.client) }),
    ...(fields.rate === undefined
      ? {}
      : { rate: fields.rate === 'none' ? null : moneyOf(fields.rate, currency) }),
  };
  return { project: projectView(await ctx.projects.update(id, patch)) };
};

/** Archives or unarchives a project. */
export const setArchived = async (
  ctx: CliContext,
  id: string,
  archived: boolean,
): Promise<ProjectResult> => ({
  project: projectView(await (archived ? ctx.projects.archive(id) : ctx.projects.unarchive(id))),
});
