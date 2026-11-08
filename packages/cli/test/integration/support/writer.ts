// Child process for the concurrency test: appends `count` entries to one day file, one
// transaction each. Usage: bun writer.ts <tempDir> <vaultRoot> <label> <count>
import { argv, exit, stderr } from 'node:process';

import { createVault, formatTimestamp, SCHEMA_VERSION, Temporal } from '@ttime/core';

import { nodeDeps } from './temp-vault';

const [, , dir, root, label, countText] = argv;
if (dir === undefined || root === undefined || label === undefined || countText === undefined) {
  stderr.write('usage: writer.ts <tempDir> <vaultRoot> <label> <count>\n');
  exit(64);
}

const vault = createVault(nodeDeps(dir, root));
const base = Temporal.ZonedDateTime.from('2026-11-08T08:00:00[Europe/Bucharest]');
const offsetMinutes = label === 'a' ? 0 : 120;

for (let i = 0; i < Number(countText); i += 1) {
  await vault.transact(async (tx) => {
    const day = await tx.readDay('2026-11-08');
    const start = base.add({ minutes: offsetMinutes + i });
    const entry = {
      id: tx.batch,
      project: 'acme-website',
      description: `${label}-${String(i)}`,
      start: formatTimestamp(start),
      end: formatTimestamp(start.add({ seconds: 30 })),
      tags: [label],
      billable: true,
      notes: [],
      createdBy: tx.actor,
    };
    tx.writeDay({ ...day, schema: SCHEMA_VERSION, entries: [...day.entries, entry] });
    tx.record({ op: 'create', kind: 'entry', id: entry.id, before: null, after: entry });
  });
}
