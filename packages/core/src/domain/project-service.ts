import { SCHEMA_VERSION } from '../lib/constants';
import { TTimeError } from '../lib/errors';
import { uniqueSlug } from '../lib/slug';
import type { Logger } from '../ports/logger';
import type { Money } from '../schema/primitives';
import type { Project } from '../schema/project';
import type { VaultTx } from '../storage/transaction';
import type { Vault } from '../storage/vault';
import { normalizeText, nowStamp, requireProject } from './entry-store';

/** Colors given to new projects in turn when none is chosen. */
export const PROJECT_COLORS = [
  '#4F7CFF',
  '#34C759',
  '#FF9500',
  '#AF52DE',
  '#FF2D55',
  '#5AC8FA',
  '#FFCC00',
  '#8E8E93',
] as const;

/** A new project. The ID is a slug of the name, made unique. */
export type CreateProjectInput = {
  readonly name: string;
  readonly client?: string;
  readonly color?: string;
  readonly billable?: boolean;
  readonly rate?: Money;
  readonly billingPeriod?: Project['billingPeriod'];
  readonly target?: NonNullable<Project['target']>;
};

/** Fields of a project that can change. The ID never changes. */
export type ProjectPatch = Partial<CreateProjectInput>;

/** Dependencies of {@link createProjectService}. */
export type ProjectServiceDeps = {
  readonly vault: Vault;
  readonly logger: Logger;
};

/** Create, update, archive and unarchive projects. */
export type ProjectService = {
  readonly create: (input: CreateProjectInput) => Promise<Project>;
  readonly update: (id: string, patch: ProjectPatch) => Promise<Project>;
  readonly archive: (id: string) => Promise<Project>;
  readonly unarchive: (id: string) => Promise<Project>;
};

const requireClient = async (tx: VaultTx, id: string | undefined): Promise<void> => {
  if (id !== undefined && (await tx.readClient(id)) === null) {
    throw new TTimeError('client.not_found', `No client "${id}"`, { details: { client: id } });
  }
};

const requireName = (name: string): string => {
  const clean = normalizeText(name);
  if (clean === '') {
    throw new TTimeError('input.invalid', 'A project needs a name');
  }
  return clean;
};

const save = (tx: VaultTx, before: Project, after: Project): Project => {
  tx.writeProject(after);
  tx.record({ op: 'update', kind: 'project', id: before.id, before, after });
  return after;
};

/** Creates the project service. Every operation is one locked vault transaction. */
export const createProjectService = ({ vault, logger }: ProjectServiceDeps): ProjectService => {
  const run = async <T>(name: string, fn: (tx: VaultTx) => Promise<T>): Promise<T> => {
    const { value, batch } = await vault.transact(fn);
    logger.info(`project.${name}`, { batch });
    return value;
  };
  const setStatus = (id: string, status: Project['status']): Promise<Project> =>
    run(status === 'archived' ? 'archive' : 'unarchive', async (tx) => {
      const project = await requireProject(tx, id, { allowArchived: true });
      return save(tx, project, { ...project, status });
    });

  return {
    create: (input) =>
      run('create', async (tx) => {
        const name = requireName(input.name);
        await requireClient(tx, input.client);
        const taken = await tx.listProjectIds();
        const id = uniqueSlug(name, new Set(taken));
        await tx.readProject(id);
        const project: Project = {
          schema: SCHEMA_VERSION,
          id,
          name,
          color: input.color ?? PROJECT_COLORS[taken.length % PROJECT_COLORS.length] ?? '#4F7CFF',
          billable: input.billable ?? true,
          billingPeriod: input.billingPeriod ?? 'monthly',
          status: 'active',
          createdAt: nowStamp(tx),
          ...(input.client === undefined ? {} : { client: input.client }),
          ...(input.rate === undefined ? {} : { rate: input.rate }),
          ...(input.target === undefined ? {} : { target: input.target }),
        };
        tx.writeProject(project);
        tx.record({ op: 'create', kind: 'project', id, before: null, after: project });
        return project;
      }),
    update: (id, patch) =>
      run('update', async (tx) => {
        const project = await requireProject(tx, id, { allowArchived: true });
        await requireClient(tx, patch.client);
        return save(tx, project, {
          ...project,
          ...patch,
          ...(patch.name === undefined ? {} : { name: requireName(patch.name) }),
        });
      }),
    archive: (id) => setStatus(id, 'archived'),
    unarchive: (id) => setStatus(id, 'active'),
  };
};
