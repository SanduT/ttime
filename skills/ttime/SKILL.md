---
name: ttime
description: Read and edit the user's ttime time tracking (timers, entries, projects, reports, CSV exports) through the ttime MCP server or the ttime CLI. Use when the user asks to log, start, stop, move or fix tracked time, asks how their hours look, or wants an export.
---

# ttime

ttime is a local-first macOS time tracker. All data is plain JSON in a vault folder the user
owns. The app, the `ttime` CLI and the `ttime` MCP server all write through the same core, so
every change is validated, locked, logged in the vault changelog and can be undone. The app shows
changes within about a second.

Use the MCP tools when they are available. Otherwise run the CLI with `--json` (same operations,
see the table at the end).

## Data model

- **Client**: optional grouping for projects.
- **Project**: what time is billed to. Its ID is an immutable slug (`acme-website`); the name can
  change. It has a color, an optional hourly rate, billable by default, and is active or archived.
- **Entry**: project, description, start, end, tags, billable, and timestamped notes. Entry IDs
  are ULIDs. Times are stored to the second with a UTC offset and are never rounded.
- **Running entry**: at most one. Starting a timer stops the running one at the same instant.

## Conventions

- Find project IDs with `list_projects` before writing. Match the user's words to a project name;
  if two could fit, ask. Create a project only when the user asks for one.
- Resolve relative dates yourself ("yesterday afternoon", "this morning") from today's date and
  the user's time zone, then pass ISO 8601 times with an offset, or local times plus `tz`.
- Rounding happens only in `summary` and `export_csv` (vault default unless the user names one).
  Never round when adding or editing entries.
- Billing periods (weekly or monthly) are per project; "this period" means that project's week or
  month.
- Before a write that is not exactly what the user said (picked a project, inferred times), say
  what you will write in one line, then write it.
- Writes touching more than 3 records return `needsConfirmation` with the changes. Show them to
  the user in a short list and call again with `confirm: true` only after they agree. Use
  `dryRun: true` to preview anything you are unsure about.
- Nothing is hard-deleted: `delete_entry` moves to the trash, `restore_entry` brings it back.
- Every write result lists its `batches`. After a write, mention that it can be undone; `undo`
  with that batch reverts it (refused if the records were edited since).
- `summary` and `export_csv` leave out the running entry; `status` includes it.

## Which tool

| Need                                      | MCP tool                           | CLI                                                    |
| ----------------------------------------- | ---------------------------------- | ------------------------------------------------------ |
| What is running, today and this week      | `status`                           | `ttime status --json`                                  |
| Projects and their IDs                    | `list_projects`                    | `ttime projects --json`                                |
| New or changed project, archive           | `create_project`, `update_project` | `ttime projects add/edit/archive`                      |
| Start, switch, stop a timer               | `start_timer`, `stop_timer`        | `ttime start "<desc> @<project>"`, `ttime stop [--at]` |
| Note on the running entry                 | `add_note`                         | `ttime note "<text>"`                                  |
| Find entries (IDs, raw times, notes)      | `list_entries`                     | `ttime ls --from --to --project --tag --query --json`  |
| Log past time                             | `add_entry`                        | `ttime add --project --start --end` or `--duration`    |
| Fix or move an entry                      | `update_entry`                     | (MCP only)                                             |
| Delete or restore an entry                | `delete_entry`, `restore_entry`    | (MCP only)                                             |
| Hours by project, day, tag or description | `summary`                          | `ttime report --group ... --json`                      |
| CSV for a client                          | `export_csv`                       | `ttime export --project --from --to`                   |
| Revert a change                           | `undo`                             | `ttime undo [--batch]`                                 |

## Examples

**"Add 2 hours yesterday afternoon on Acme for the auth review"**

1. `list_projects` → `acme-website`.
2. Yesterday afternoon: pick 14:00 unless `list_entries` for yesterday shows a clash; then use
   the first free slot after 13:00.
3. `add_entry { project: "acme-website", start: "2026-11-07T14:00", duration: "2h",
description: "Auth review", tz: "Europe/Berlin" }`.
4. Reply: "Added 14:00 to 16:00 yesterday on Acme Website, Auth review. Say undo to revert."

**"How do my hours look for Acme this week?"**
`summary { period: "this-week", project: "acme-website", groupBy: "day" }`, then `status` if a
timer is running on it. Answer with the total, billable hours, amount, and the busiest day.

**"Move this morning's entries to project Internal"**

1. `list_entries { from: "today" }`, keep those that start before 12:00.
2. Name them in a short list. For each, `update_entry { id, project: "internal" }`. If there are
   more than 3, preview first with `dryRun: true` and get a yes.

**"Export last month for Acme"**
`export_csv { period: "last-month", project: "acme-website" }` and give the user the returned
path. Mention the rounding used (the vault default unless they asked for one).

**"Stop my timer at 17:30"**
`stop_timer { at: "17:30" }` (local time, today).
