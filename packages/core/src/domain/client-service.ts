import { SCHEMA_VERSION } from '../lib/constants';
import { TTimeError } from '../lib/errors';
import { uniqueSlug } from '../lib/slug';
import type { Logger } from '../ports/logger';
import type { Client } from '../schema/client';
import type { Money } from '../schema/primitives';
import type { VaultTx } from '../storage/transaction';
import type { Vault } from '../storage/vault';
import { normalizeText, nowStamp } from './entry-store';

/** A new client. The ID is a slug of the name, made unique. */
export type CreateClientInput = {
  readonly name: string;
  readonly defaultRate?: Money;
  readonly notes?: string;
};

/** Fields of a client that can change. The ID never changes. */
export type ClientPatch = Partial<CreateClientInput>;

/** Dependencies of {@link createClientService}. */
export type ClientServiceDeps = {
  readonly vault: Vault;
  readonly logger: Logger;
};

/** Create, update, archive and unarchive clients. */
export type ClientService = {
  readonly create: (input: CreateClientInput) => Promise<Client>;
  readonly update: (id: string, patch: ClientPatch) => Promise<Client>;
  readonly archive: (id: string) => Promise<Client>;
  readonly unarchive: (id: string) => Promise<Client>;
};

const requireName = (name: string): string => {
  const clean = normalizeText(name);
  if (clean === '') {
    throw new TTimeError('input.invalid', 'A client needs a name');
  }
  return clean;
};

const requireClient = async (tx: VaultTx, id: string): Promise<Client> => {
  const client = await tx.readClient(id);
  if (client === null) {
    throw new TTimeError('client.not_found', `No client "${id}"`, { details: { client: id } });
  }
  return client;
};

/** Creates the client service. Every operation is one locked vault transaction. */
export const createClientService = ({ vault, logger }: ClientServiceDeps): ClientService => {
  const run = async <T>(name: string, fn: (tx: VaultTx) => Promise<T>): Promise<T> => {
    const { value, batch } = await vault.transact(fn);
    logger.info(`client.${name}`, { batch });
    return value;
  };
  const change = (name: string, id: string, fn: (client: Client) => Client): Promise<Client> =>
    run(name, async (tx) => {
      const before = await requireClient(tx, id);
      const after = fn(before);
      tx.writeClient(after);
      tx.record({ op: 'update', kind: 'client', id, before, after });
      return after;
    });

  return {
    create: (input) =>
      run('create', async (tx) => {
        const name = requireName(input.name);
        const id = uniqueSlug(name, new Set(await tx.listClientIds()));
        await tx.readClient(id);
        const client: Client = {
          schema: SCHEMA_VERSION,
          id,
          name,
          notes: input.notes ?? '',
          archived: false,
          createdAt: nowStamp(tx),
          ...(input.defaultRate === undefined ? {} : { defaultRate: input.defaultRate }),
        };
        tx.writeClient(client);
        tx.record({ op: 'create', kind: 'client', id, before: null, after: client });
        return client;
      }),
    update: (id, patch) =>
      change('update', id, (client) => ({
        ...client,
        ...patch,
        ...(patch.name === undefined ? {} : { name: requireName(patch.name) }),
      })),
    archive: (id) => change('archive', id, (client) => ({ ...client, archived: true })),
    unarchive: (id) => change('unarchive', id, (client) => ({ ...client, archived: false })),
  };
};
