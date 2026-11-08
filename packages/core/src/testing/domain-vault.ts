import { createClientService } from '../domain/client-service';
import { createEntryService } from '../domain/entry-service';
import { createProjectService } from '../domain/project-service';
import { createTimerService } from '../domain/timer-service';
import { parseJson } from '../lib/json';
import type { Entry } from '../schema/entry';
import { buildClient, buildProject } from './builders';
import { createTestVault, type TestVault, type TestVaultOptions } from './test-vault';

/** A test vault with a client, three projects and every domain service wired to it. */
export type DomainTestVault = TestVault & {
  readonly timer: ReturnType<typeof createTimerService>;
  readonly entries: ReturnType<typeof createEntryService>;
  readonly projects: ReturnType<typeof createProjectService>;
  readonly clients: ReturnType<typeof createClientService>;
  /** Entries of a day file as the reader sees them. Default date 2026-11-08. */
  readonly day: (date?: string) => Promise<readonly Entry[]>;
  /** Parsed lines of the November 2026 changelog. */
  readonly changelog: () => Promise<readonly unknown[]>;
};

/**
 * Projects: `acme-website` (billable, client `acme`), `internal` (not billable) and `legacy`
 * (archived). The clock starts at 2026-11-08 10:00 Europe/Bucharest unless overridden.
 */
export const createDomainTestVault = async (
  options: TestVaultOptions = {},
): Promise<DomainTestVault> => {
  const tv = await createTestVault(options);
  await tv.writeJson('clients/acme.json', buildClient());
  await tv.writeJson('projects/acme-website.json', buildProject());
  await tv.writeJson(
    'projects/internal.json',
    buildProject({ id: 'internal', name: 'Internal', billable: false, client: undefined }),
  );
  await tv.writeJson(
    'projects/legacy.json',
    buildProject({ id: 'legacy', name: 'Legacy', status: 'archived' }),
  );
  const deps = { vault: tv.vault, ids: tv.ids, logger: tv.logger };
  return {
    ...tv,
    timer: createTimerService(deps),
    entries: createEntryService(deps),
    projects: createProjectService(deps),
    clients: createClientService(deps),
    day: async (date = '2026-11-08') => (await tv.vault.read()).days.get(date)?.entries ?? [],
    changelog: async () =>
      ((await tv.readRaw('changelog/2026-11.jsonl')) ?? '')
        .split('\n')
        .filter((line) => line !== '')
        .map((line) => parseJson(line)),
  };
};
