# ttime: Product Requirements

Status: Draft v0.3 (2026-11-08)
Architecture: `docs/ARCHITECTURE.md`

Phase 1 gets ttime working every day on the owner's Mac. Phase 2 makes it shareable and open source (section 11).

## 1. Summary

ttime is a native, local-first macOS time tracker for one person juggling several client projects.

Daily use happens without opening a window:

- a global hotkey brings up a launcher-style **quick bar** to start, switch, pause or annotate work;
- a **menu bar item** always shows the running timer, with controls one click away.

A **main window** is for review: projects, a calendar of what was done, analytics, and CSV exports per project and period for invoicing.

All data lives as **plain files in a folder the user owns** (like a Bruno collection). A **local MCP server and skill** let an AI model read and edit that data on request ("add 2 hours yesterday for the Acme auth review", "how do my hours look for Acme this week?").

## 2. Why

- Hosted trackers can change their APIs at any time, and third-party Mac clients built on them break when they do.
- Existing Mac-native alternatives are subscriptions, cloud-backed, or heavy on features this use case does not need.
- Tracking only happens if it costs near zero effort. If starting or switching means opening an app, it will not be used.
- Invoicing and client accountability need trustworthy, exportable records with notes about what was actually done.

## 3. Goals and non-goals

### Goals

- **G1** Start, switch, pause and annotate work in under 3 seconds from any app, via a global hotkey.
- **G2** The running timer is always visible in the menu bar, with controls one click away.
- **G3** A timer is durable: it keeps running across app quits, crashes, sleep and restarts until it is explicitly stopped.
- **G4** All data is local, human-readable, diff-friendly files in a user-chosen folder. No account, no network, no telemetry.
- **G5** Review surfaces: projects, calendar, analytics, and per-project CSV export for any period.
- **G6** AI-operable: a local MCP server, a CLI and a skill so a model can query and edit time data in plain language, safely.
- **G7** Minimal, launcher-inspired design that feels fully native.

### Non-goals (v1)

- Sync, multiple devices, mobile apps. (The user may put the vault in iCloud Drive or git; ttime does not manage that.)
- Teams, roles, approvals.
- Generating invoices. Exports feed the existing invoicing tool.
- Automatic activity tracking or screen monitoring (autotracking).
- Several timers running at once. One timer keeps billable time honest.
- Windows or Linux in Phases 1 and 2. The stack allows them later (Phase 3).

## 4. User and core scenarios

**User:** one person working on several client projects in parallel, billing by the hour, on macOS, keyboard-heavy, already used to keyboard launchers.

| #   | Scenario        | Expected behaviour                                                                                                                                                        |
| --- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Start           | Hotkey, type `auth refactor @acme`, Enter. Timer starts on Acme; menu bar shows the project color and `0:00`.                                                             |
| S2  | Annotate        | An hour later: hotkey, type `finished login flow, starting token refresh`, ⌘Enter. A timestamped note is added to the running entry; the timer keeps going.               |
| S3  | Switch          | Hotkey, type `sprint planning @globex`, Enter. The Acme entry ends now; the Globex entry starts at the same instant (no gap, no overlap).                                 |
| S4  | Pause / resume  | Menu bar: Pause. Later: Resume continues the same project and description as a new segment.                                                                               |
| S5  | Forgot to start | Hotkey, `code review @acme -20m`. The entry starts 20 minutes ago.                                                                                                        |
| S6  | Forgot to stop  | After the configured limit a notification asks "Still on Acme? Running 9h 12m" with Keep / Stop at last activity / Edit.                                                  |
| S7  | Away from desk  | Back after 40 idle minutes: Keep all / Discard idle time / Discard idle and stop / Assign idle time to another project.                                                   |
| S8  | Month end       | Analytics, "Last month", Acme, Export CSV (rounded to 15 min, Excel-friendly), Copy summary for the invoice email.                                                        |
| S9  | AI              | In Claude: "add 2 hours yesterday afternoon on Acme for the auth review". The model calls the MCP server, shows what it will write, writes it; the calendar updates live. |
| S10 | Fix the past    | Calendar week view: drag to create a missing block, resize an entry, move it to another project.                                                                          |

## 5. Concepts and rules

| Concept       | Definition                                                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vault         | The folder holding all ttime data. Chosen at first launch; can be changed later.                                                                                                      |
| Client        | Optional grouping for projects: name, optional default rate, notes.                                                                                                                   |
| Project       | What time is billed to: name, client, color, hourly rate (optional), billable by default, billing period (weekly or monthly), status (active or archived), optional target or budget. |
| Entry         | One continuous block of time on one project: start, end (empty while running), description, tags, billable flag, notes.                                                               |
| Note          | A timestamped line attached to an entry ("10:42 finished login flow"). Adds detail without splitting the entry.                                                                       |
| Running timer | The single entry without an end. Written to disk the moment it starts.                                                                                                                |
| Period        | A date range for reports and exports (this week, last month, custom). Nothing is ever "reset"; periods are filters.                                                                   |
| Invoiced mark | (P1) A period marked as invoiced for a project; editing entries inside it asks for confirmation.                                                                                      |

Rules:

1. At most one entry is running.
2. Starting a new entry stops the running one at the same timestamp.
3. Pause is a stop. Resume starts a new entry copying project, description and tags. Reports group segments by description, so pausing never fragments an invoice line.
4. Raw times are stored exactly (to the second). Rounding is applied only in exports and reports, never to stored data.
5. Entries crossing midnight stay one entry; reports split them by day. A "day starts at" setting (default 00:00, for example 04:00) lets late-night work count toward the previous day.
6. Timestamps are stored with their UTC offset so travel and daylight saving changes never corrupt history.
7. Nothing is hard-deleted by the app or by the AI tools; deleted items go to the vault trash.

## 6. Surfaces and functional requirements

Priority: **P0** = v1 must have, **P1** = should have soon after, **P2** = later.

### 6.1 Quick bar (global hotkey panel)

The heart of the app: a floating, launcher-like panel that appears over any app.

- **P0** Global hotkey (default ⌥⇧Space, configurable) toggles the panel. Esc closes it and focus returns to the previous app.
- **P0** Header shows the running state: project color, project, description, start time, elapsed. Empty state: "Not tracking".
- **P0** One text field, "What are you working on?", with inline tokens:
  - `@project` with fuzzy autocomplete (offers to create the project if nothing matches);
  - `#tag`;
  - `-20m` or `-1h15` to backdate the start, `at 9:30` to start at a clock time;
  - (P1) `$` / `!$` to force billable or non-billable.
- **P0** Under the field, a list of recent unique entries (description + project) for one-key continue, filtered as you type. Descriptions autocomplete from history.
- **P0** Actions:
  - Enter: start a new entry (switches if one is running).
  - ⌘Enter: add the text as a note to the running entry (starts one if nothing is running).
  - ⌘. stop, ⌘P pause / resume, ⌘E edit the running entry (project, description, start time), ⌘O open the main window.
  - ⌘K: action panel listing every action with its shortcut (launcher pattern), with shortcut hints in the footer.
- **P0** Appears in under 150 ms and is fully usable from the keyboard.
- **P1** Optional extra hotkeys: Add note (opens directly in note mode), Stop, Resume last.
- **P1** Favorites: pin up to 9 entries and start them with ⌘1 to ⌘9.

### 6.2 Menu bar

- **P0** Status item shows the project color dot and elapsed time (h:mm; seconds optional). When stopped: a monochrome icon, optionally with today's total.
- **P0** Clicking opens a compact popover:
  - running entry: project, description, started at, latest notes, elapsed;
  - buttons: Stop, Pause / Resume, Add note…, New / Switch… (opens the quick bar), Discard (with confirmation);
  - recent and favorite entries, startable in one click;
  - Today and This week totals, expandable per project;
  - Open ttime, Settings, Quit.
- **P0** Display options: time only, project + time, icon only.
- **P1** Target progress, for example "Acme 22h / 30h this week", when a target exists.

### 6.3 Main window

Sidebar: Today, Calendar, Projects, Analytics. Settings open in their own view with ⌘,.

#### Today (P0)

- Chronological list of today's entries with their notes; inline edit of description, project, start and end; delete (to trash).
- Gaps between entries inside working hours are highlighted with a "Fill gap" action.
- Day total and per-project totals. Day navigation with ← / → and T for today.

#### Projects (P0)

- List grouped by client: color, name, hours this week, this month and all time, status. Create, edit, archive, unarchive.
- Project detail: entries grouped by day with notes, totals for the selected period, rate and amount when set, Export CSV for the period.
- **P1** Target or budget progress; list of invoiced periods.

#### Calendar (P0 week view; P1 day and month views)

- Week view (week start configurable) with entries as colored blocks, a current-time line and a working-hours band.
- Click to edit; drag on empty space to create; drag edges to resize; drag the block to move; ⌥-drag to duplicate.
- Overlapping entries are visibly flagged.
- **P1** Month view with daily totals as a heatmap; single-day view.
- **P2** Show Apple Calendar events (read-only) next to entries, with "Create entry from event".

#### Analytics

- **P0** Period picker: Today, This week, Last week, This month, Last month, This year, Custom, with previous / next arrows.
- **P0** Totals: hours, billable hours, amount (when rates exist).
- **P0** Hours per project (bar chart) and hours per day stacked by project.
- **P0** Table per project: hours, share of total, amount. Drill into a project for its daily breakdown, entries and notes.
- **P0** Export from here (see 6.4).
- **P1** Comparison with the previous period, breakdown by tag, weekday by hour heatmap ("when do I work"), average session length.

### 6.4 Export

- **P0** CSV for one project or all projects over any period, from Project detail and Analytics.
- **P0** Modes: Detailed (one row per entry) and Daily summary (one row per project per day, descriptions and notes merged).
- **P0** Detailed columns: `date, start, end, duration_decimal, duration_hhmm, project, client, description, notes, tags, billable, rate, amount`.
- **P0** Rounding (export and reports only): none, up, down or nearest; interval 1, 5, 6, 10, 15 or 30 minutes; applied per entry or per day total.
- **P0** Locale options: delimiter (comma or semicolon), decimal separator (dot or comma), UTF-8 with BOM so Excel opens it correctly.
- **P1** Copy summary: plain text or Markdown for an invoice email (period, total, per-day lines or a bullet list of what was done).
- **P1** Mark the exported period as invoiced.
- **P2** PDF timesheet.

### 6.5 Reliability helpers

- **P0** Durable timer: running state is on disk from the first second; relaunch restores it; launch at login is on by default.
- **P0** Idle detection: after N minutes without input (default 10), or after sleep or screen lock, ask on return: Keep all / Discard idle time / Discard idle and stop / Assign idle time to another project.
- **P0** Forgotten timer: notify when a timer passes N hours (default 4, repeating), plus an optional auto-stop at a set time of day that stops at the last activity, not at the auto-stop time.
- **P1** Tracking reminder: during working hours, if the Mac is in use and nothing has been tracked for N minutes, nudge with Start / Resume last.
- **P1** End-of-day review nudge: today's total and unfilled gaps.
- **P2** After a video call ends (Zoom, Meet, Teams), prompt to log it.
- **P2** Pomodoro-style break nudges.

### 6.6 AI interface (P1, designed for from day one)

- A local **MCP server** (stdio) shipped with the app, plus a **`ttime` CLI**, both built on the same core library as the app and operating only on the vault.
- Initial tools:
  - `status`: running entry, today and week totals;
  - `list_projects`, `create_project`, `update_project`;
  - `start_timer(project, description, start?)`, `stop_timer(at?)`, `add_note(text, at?)`;
  - `list_entries(from, to, project?, tag?, query?)`;
  - `add_entry(project, start, end or duration, description, tags?, notes?)`, `update_entry(id, ...)`, `delete_entry(id)` (to trash);
  - `summary(from, to, group_by: project | day | tag | description)`;
  - `export_csv(from, to, project?, options)`: writes to the vault `exports/` folder and returns the path.
- Natural-language dates are the model's job; tools take ISO 8601 timestamps plus a time zone.
- Safety:
  - every write is appended to a changelog in the vault with before and after values;
  - changes touching more than a few entries need a dry run first, then `confirm: true`;
  - nothing is hard-deleted;
  - the app shows recent external changes and can undo them.
- A **skill** (`SKILL.md`) in the repo explains the data model, conventions (project naming, rounding, billing periods) and example requests.
- The app reflects external changes (MCP, CLI, hand edits, git pull) within about 1 second.
- **P2** URL scheme (`ttime://start?project=acme&description=...`) and Shortcuts actions for automation tools and launcher scripts.

### 6.7 Settings

Vault location (with Reveal in Finder), hotkeys, menu bar display, week start, day start, working hours, idle threshold, forgotten-timer limit and auto-stop, reminders, default rounding and CSV locale, launch at login, appearance (system, light, dark).

## 7. Data and storage requirements

- **D1** Everything lives in one vault folder. The app reads and writes only that folder (plus its own preferences).
- **D2** Plain text, human-readable and hand-editable, with stable ordering and formatting so git diffs are small and meaningful.
- **D3** Data is split into small files (for example per project, and entries per day or month) so one edit touches one small file and sync conflicts stay local.
- **D4** Atomic writes (write to a temp file, then rename). A crash never leaves a half-written file.
- **D5** The app watches the vault and reloads external edits. Invalid files are reported (file and line) and left untouched, never overwritten.
- **D6** Stable IDs for entries, projects and clients, so renames never break history and AI tools can target records precisely.
- **D7** The running timer is persisted as data, not held only in memory.
- **D8** Deleted items move to a trash area inside the vault and can be restored.
- **D9** App-only state (window layout, caches, locks) lives outside the vault, so the vault contains only user data.
- **D10** The vault records a schema version to allow future migrations.

Vault layout (JSON, schema 1; full specification in `FORMAT.md`):

```
MyTime/                             vault root
  ttime.json                        vault config and schema version
  clients/acme.json
  projects/acme-website.json        id, name, client, color, rate, billing period, status
  entries/2026/11/2026-11-08.json   one file per day
  running.json                      the running entry, or null
  changelog/2026-11.jsonl           append-only log of writes (app, CLI, AI)
  exports/
  .trash/
```

## 8. Design direction

- Launcher-inspired: keyboard first, one input with a list below, an action panel on ⌘K, shortcut hints in the footer.
- Quiet, warm neutral interface where project colors are the main color and one app accent marks focus and the primary action. Native translucent materials, short spring animations.
- SF Pro for text; monospaced digits for every timer so numbers never jitter.
- Light and dark mode follow the system.
- Minimal by default, depth on demand: daily life is the quick bar and the menu bar; the main window is for review and fixes.
- Native behaviour: standard shortcuts and menus, a Settings window, undo and redo (⌘Z) everywhere, VoiceOver labels, respects Reduce Motion.

## 9. Non-functional requirements

- macOS app built with Tauri 2: a TypeScript core and React UI, with a thin Rust layer for system integration. Phase 1 targets macOS 26; Phase 2 evaluates macOS 15; Windows and Linux are possible in Phase 3.
- Performance: quick bar opens in under 150 ms; the menu bar tick has negligible CPU cost; analytics for a year of data render in under 500 ms; scales to 10 years (about 50,000 entries).
- Privacy: no analytics, no telemetry, works fully offline. Phase 1 makes no network requests at all. In Phase 2 the only exception is an opt-in update check.
- Distribution: Phase 1 is a local build signed with the owner's Apple Developer team. Phase 2 ships notarized Developer ID builds outside the App Store.
- Data safety comes first: no operation may silently lose time data.

## 10. Common ideas adopted

| Idea                                                                 | Priority |
| -------------------------------------------------------------------- | -------- |
| Plain-text files in a user folder, git-friendly, local prefs ignored | P0       |
| Menu bar timer showing the current project                           | P0       |
| Continue from recent unique entries                                  | P0       |
| Inline `@project` and `#tag` while typing                            | P0       |
| Idle detection with a choice of what to do with the time             | P0       |
| Forgotten-timer alert and end-of-day auto-stop                       | P0       |
| Rounding only in reports (up, down, nearest; several intervals)      | P0       |
| Late-night work counted toward the same day                          | P0       |
| Time-zone-safe history                                               | P0       |
| Configurable CSV export                                              | P0       |
| Calendar view of past work with drag editing                         | P0       |
| Tracking reminders during working hours                              | P1       |
| Favorites started by hotkey                                          | P1       |
| Targets and budgets per project                                      | P1       |
| Working-hours band and review reminders                              | P1       |
| Locking invoiced periods                                             | P1       |
| Turning calendar events into entries                                 | P2       |
| Prompt to log time after a video call                                | P2       |

Deliberately left out: automatic activity tracking, simultaneous timers, team features, invoicing.

## 11. Phases and milestones

### Phase 1: working on the owner's Mac

Built locally, signed with the owner's development certificate, installed in /Applications.

- **M1 Core loop:** vault setup, projects, quick bar, menu bar, durable timer, Today view, entry editing, basic CSV export.
- **M2 Review:** calendar week view with drag editing, analytics, rounding and CSV locale options, idle detection, forgotten-timer handling.
- **M3 AI:** shared core library, CLI, MCP server, skill, changelog and undo for external changes.
- **M4 Polish (as time allows):** reminders, favorites, targets and budgets, invoiced periods, copy summary, month and day views, URL scheme and Shortcuts, calendar events.

### Phase 2: shareable and open source

Starts once Phase 1 is in daily use (details in `ARCHITECTURE.md` section 14):

- notarized Developer ID builds as a DMG on GitHub Releases, built by GitHub Actions;
- a Homebrew tap;
- opt-in update checks (Tauri updater), the only network access the app may make;
- first-run onboarding and in-app setup for the CLI, MCP server and skill;
- evaluating macOS 15 support;
- MIT license, vault format documentation, README and contributor docs.

### Phase 3 (optional): Windows and Linux

The core, CLI, MCP server, vault format and UI carry over. The quick bar panel, menu bar timer, idle signals and window materials need per-platform work (`ARCHITECTURE.md` section 15).

## 12. Acceptance criteria for v1 (M1 + M2)

1. From any app, hotkey, type, Enter starts or switches tracking; the menu bar updates within 1 second.
2. Quitting, force-killing or rebooting while a timer runs: on relaunch the timer shows the correct elapsed time.
3. Notes added during an entry appear in Today, Project detail and the CSV export.
4. Editing a vault file in a text editor updates the app within 1 second; a broken file shows an error and is never overwritten.
5. Exporting last month for one project produces a CSV that opens correctly in Excel and Numbers with the chosen delimiter and decimal settings, and rounded totals match the analytics view using the same rounding.
6. Idle and forgotten-timer prompts behave as specified and never remove time without an explicit choice.
7. The app makes zero network requests (Phase 1).

## 13. Decisions and open questions

Resolved (details in `ARCHITECTURE.md` section 1):

- All data is JSON; entries are stored one file per day.
- Stack: Tauri 2 with a TypeScript core and React UI; Rust only for a thin system layer (tray, panels, hotkey, file access, idle and power signals).
- The app, CLI and MCP server share the TypeScript core and write files directly, with a cross-process lock and atomic writes.
- The quick bar is a native macOS panel (`tauri-nspanel`); the menu bar timer uses Tauri's tray API; macOS 26 for Phase 1.
- Global hotkey through Tauri's global-shortcut plugin.
- No SQLite in Phase 1: the app builds an in-memory index from the files.
- Phase 1 runs on the owner's Mac. Phase 2 adds notarized distribution and open source under MIT. Phase 3 could add Windows and Linux.

Still open: the final product name, and confirming the default hotkey (⌥⇧Space proposed).
