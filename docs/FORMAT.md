# ttime vault format

Status: schema 1, stable. This is a public contract: any tool may read and write a vault by these
rules, and ttime keeps reading schema 1 vaults after later schemas ship (section 5).

A vault is a plain folder of JSON files. It works with git, Syncthing, iCloud Drive or Dropbox,
and any text editor. The `ttime` CLI and MCP server write through the same rules as the app, so
prefer them for writes: they lock, validate and log every change.

## 1. Layout

```
<vault>/
  ttime.json                       vault config and schema version
  clients/<client-id>.json
  projects/<project-id>.json
  entries/<yyyy>/<mm>/<yyyy-mm-dd>.json
  running.json                     the running entry, or null
  changelog/<yyyy-mm>.jsonl        append-only write log
  exports/                         CSV output
  .trash/entries/<entry-id>.json   deleted entries
```

Only user data lives in the vault. Locks, caches and app preferences live outside it, in `~/.config/ttime`.

## 2. Conventions

- UTF-8, pretty-printed, 2-space indent, keys sorted, trailing newline. Arrays in a deterministic order (entries by `start`, then `id`). This keeps git diffs minimal. (The examples below show content; real files have sorted keys.)
- Timestamps: ISO 8601 with seconds and the local UTC offset, for example `2026-11-08T09:30:00+02:00`. No fractional seconds.
- Durations are always computed from timestamps, never stored.
- Money: `{ "amount": "50.00", "currency": "EUR" }`. The amount is a decimal string handled with `big.js`. No floating point anywhere near money.
- IDs:
  - Client and project IDs are immutable slugs (`acme`, `acme-website`): unique, `[a-z0-9-]`, generated from the name at creation (with a numeric suffix on collision). Display names can change freely. Slugs keep files and entries readable for humans and AI.
  - Entry IDs are ULIDs (time-sortable, 26 characters).
- Unknown keys are preserved on rewrite so hand-added fields and future fields survive.
- Every file carries `"schema": 1`.

## 3. Files

`ttime.json` holds vault-level settings, the ones that change what reports mean:

```json
{
  "schema": 1,
  "name": "My time",
  "createdAt": "2026-11-08T12:00:00+02:00",
  "settings": {
    "weekStartsOn": "monday",
    "dayStartsAt": "00:00",
    "workingHours": {
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "start": "09:00",
      "end": "18:00"
    },
    "defaultCurrency": "EUR",
    "rounding": { "mode": "none", "minutes": 15, "scope": "entry" },
    "csv": { "delimiter": ",", "decimalSeparator": ".", "bom": true }
  }
}
```

`clients/acme.json`:

```json
{
  "schema": 1,
  "id": "acme",
  "name": "Acme GmbH",
  "defaultRate": { "amount": "50.00", "currency": "EUR" },
  "notes": "",
  "archived": false,
  "createdAt": "2026-11-08T12:00:00+02:00"
}
```

`projects/acme-website.json`:

```json
{
  "schema": 1,
  "id": "acme-website",
  "name": "Acme Website",
  "client": "acme",
  "color": "#4F7CFF",
  "billable": true,
  "rate": { "amount": "50.00", "currency": "EUR" },
  "billingPeriod": "monthly",
  "target": { "hours": 30, "per": "week" },
  "status": "active",
  "invoicedThrough": null,
  "createdAt": "2026-11-08T12:00:00+02:00"
}
```

`client`, `rate`, `target` and `invoicedThrough` are optional. `rate` falls back to the client's `defaultRate`.

`entries/2026/11/2026-11-08.json`:

```json
{
  "schema": 1,
  "date": "2026-11-08",
  "entries": [
    {
      "id": "01JC8Z6YQ8K3N7R2T5V9W1X4Z0",
      "project": "acme-website",
      "description": "auth refactor",
      "start": "2026-11-08T09:30:00+02:00",
      "end": "2026-11-08T11:15:12+02:00",
      "tags": ["backend"],
      "billable": true,
      "notes": [{ "at": "2026-11-08T10:42:00+02:00", "text": "finished login flow" }],
      "createdBy": "app",
      "updatedAt": "2026-11-08T11:15:12+02:00"
    }
  ]
}
```

Rules:

- An entry lives in the day file of the local date of its `start`. Changing the start to another date moves the entry between files in one locked transaction.
- `dayStartsAt` and midnight splitting affect reports only, never which file an entry lives in.
- A day whose entries were all removed keeps its file with `"entries": []`. Files are not deleted, which is friendlier to sync tools.

`running.json`:

```json
{
  "schema": 1,
  "entry": {
    "id": "01JC9A2B3C4D5E6F7G8H9J0K1M",
    "project": "acme-website",
    "description": "token refresh",
    "start": "2026-11-08T11:15:12+02:00",
    "tags": [],
    "billable": true,
    "notes": [],
    "createdBy": "app"
  }
}
```

When nothing runs: `{ "schema": 1, "entry": null }`.

Running entry lifecycle and crash safety:

- **Start:** write `running.json`.
- **Stop:** (1) add the finished entry to its day file, (2) set `running.json` to null. If the process dies between the two steps, the next load finds the same ID in both places, keeps the day-file copy and clears `running.json`. Every operation is idempotent by ID.
- **Switch:** stop at T and start at T inside one locked transaction.
- **Notes** on a running entry are written to `running.json` immediately.

`changelog/2026-11.jsonl`, one line per change:

```json
{
  "actor": "mcp",
  "after": { "...": "..." },
  "at": "2026-11-08T12:01:03+02:00",
  "batch": "01JC9B...",
  "before": null,
  "id": "01JC9A...",
  "kind": "entry",
  "op": "create"
}
```

- `actor`: `app`, `cli` or `mcp`. `op`: `create`, `update`, `delete`, `restore`, `start`, `stop`, `note`.
- `batch` groups a multi-record change so it can be undone as one unit. Undo applies `before` for every line in a batch and is itself logged as a new batch.

Trash: a deleted entry is written to `.trash/entries/<id>.json` with `deletedAt` and `deletedBy`, then removed from its day file. Clients and projects are archived, never deleted.

## 4. Validation

ttime validates every file while loading:

- valid JSON with a known schema version;
- finished entries have `end > start`; no start more than a minute in the future;
- the referenced project exists (if not, the entry still loads and is flagged "unknown project");
- entry IDs are unique across the vault;
- each entry is in the right day file (if not, it is flagged and fixable in one click).

Problems become `VaultIssue` objects (file, JSON path, message, severity). The app shows them in a banner and an Issues view; the CLI prints them with `ttime doctor`.

**A file that failed to parse is never rewritten** until it parses again. Operations that would touch it fail with a clear error.

Overlapping entries are allowed and reported as warnings.

## 5. Migrations

The migrations module maps schema N to N+1. When the app opens a vault with an older schema it explains what will change, writes a zip backup next to the vault, then migrates. A vault with a newer schema than the app understands opens read-only.

### Writing safely from other tools

- Easiest: call `ttime` (CLI or MCP), which does all of the below.
- Take the lock the app uses: the directory
  `~/.config/ttime/locks/<sha256 of the vault's canonical path>.lock`, created with `mkdir` (which
  fails if it exists) and holding an `owner.json`. Remove it when done. A lock whose owner stopped
  refreshing it is treated as stale and taken over.
- Re-read the file, change it, keep unknown keys, then write a temporary file next to it and
  rename it over the original.
- Append a changelog line for each change so it can be undone.
