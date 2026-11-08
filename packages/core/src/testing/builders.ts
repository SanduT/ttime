import { SCHEMA_VERSION } from '../lib/constants';
import { encodeUlid } from '../lib/ulid';
import type { Client } from '../schema/client';
import type { DayFile, Entry, RunningEntry } from '../schema/entry';
import type { Project } from '../schema/project';

const BASE_MS = 1_762_500_000_000;
let sequence = 0;

/** A fresh valid ULID for test records. */
const testId = (): string => {
  sequence += 1;
  return encodeUlid(BASE_MS + sequence, new Uint8Array(10));
};

/** A finished entry with sensible defaults. */
export const buildEntry = (overrides: Partial<Entry> = {}): Entry => ({
  id: testId(),
  project: 'acme-website',
  description: 'auth refactor',
  start: '2026-11-08T09:00:00+02:00',
  end: '2026-11-08T10:00:00+02:00',
  tags: [],
  billable: true,
  notes: [],
  createdBy: 'app',
  ...overrides,
});

/** A running entry with sensible defaults. */
export const buildRunning = (overrides: Partial<RunningEntry> = {}): RunningEntry => ({
  id: testId(),
  project: 'acme-website',
  description: 'token refresh',
  start: '2026-11-08T09:00:00+02:00',
  tags: [],
  billable: true,
  notes: [],
  createdBy: 'app',
  ...overrides,
});

/** A day file holding `entries`. */
export const buildDay = (date: string, entries: readonly Entry[]): DayFile => ({
  schema: SCHEMA_VERSION,
  date,
  entries: [...entries],
});

/** A project with sensible defaults. */
export const buildProject = (overrides: Partial<Project> = {}): Project => ({
  schema: SCHEMA_VERSION,
  id: 'acme-website',
  name: 'Acme Website',
  client: 'acme',
  color: '#4F7CFF',
  billable: true,
  billingPeriod: 'monthly',
  status: 'active',
  createdAt: '2026-11-01T12:00:00+02:00',
  ...overrides,
});

/** A client with sensible defaults. */
export const buildClient = (overrides: Partial<Client> = {}): Client => ({
  schema: SCHEMA_VERSION,
  id: 'acme',
  name: 'Acme GmbH',
  notes: '',
  archived: false,
  createdAt: '2026-11-01T12:00:00+02:00',
  ...overrides,
});
