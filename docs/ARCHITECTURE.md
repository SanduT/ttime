# ttime: Architecture

Status: Draft v0.2 (2026-11-08). Stack: Tauri 2, TypeScript, React.
Companion to `docs/PRD.md`. Coding rules (linting, layering, errors, logging, tests) live in `docs/CONVENTIONS.md`.

- **Phase 1:** everything needed to run ttime every day on the owner's Mac.
- **Phase 2:** make it shareable and open source (section 14).
- **Phase 3 (optional):** Windows and Linux (section 15).

Phase 1 follows a few guardrails (section 13) so the later phases are additive, not rewrites.

## 1. Decisions

| Area                        | Decision                                                                                                                                                                                                                                         | Why                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Stack                       | Tauri 2. TypeScript for all product logic and UI; Rust only for a thin system layer                                                                                                                                                              | The owner works in TypeScript. Tauri apps are small and use the system webview         |
| Language split              | TypeScript: domain rules, vault format, storage, CLI, MCP server, UI. Rust: tray, panels, global shortcut, file I/O primitives, file watching, idle and power signals, timers that must fire on time                                             | The Rust surface stays small and rarely changes; everything that evolves is TypeScript |
| Package manager and runtime | Bun: workspaces, tests, CLI runtime, single-binary compile                                                                                                                                                                                       | One tool for install, test, run and compile                                            |
| UI                          | React with Vite (one HTML entry per window), Tailwind CSS, `cmdk` for the quick bar and the ⌘K action panel, Radix primitives for dialogs and menus, Recharts for charts                                                                         | `cmdk` is the standard launcher-style command menu for React                           |
| UI state                    | One Zustand store per window, fed by the shared core                                                                                                                                                                                             | Small and explicit                                                                     |
| Validation                  | Zod schemas for every vault file and every MCP tool input; TypeScript types are inferred from them                                                                                                                                               | One source of truth for data shapes                                                    |
| Dates and money             | `temporal-polyfill` (the Temporal API) for time zones and UTC offsets; money as decimal strings handled with `big.js`                                                                                                                            | Correct offsets and daylight saving; no floating point money                           |
| Storage                     | JSON vault: one file per client, per project and per day of entries (section 4)                                                                                                                                                                  | Chosen format                                                                          |
| Writers                     | App, CLI and MCP server all write through `@ttime/core`, using a cross-process lock and atomic writes                                                                                                                                            | No IPC between processes; all three behave identically                                 |
| Quick bar                   | `tauri-nspanel` turns a Tauri window into a non-activating `NSPanel`                                                                                                                                                                             | launcher-like focus behaviour on macOS                                                 |
| Menu bar                    | Tauri tray icon: a colored dot icon plus title text with the elapsed time                                                                                                                                                                        | Built into Tauri                                                                       |
| Global hotkey               | `tauri-plugin-global-shortcut`                                                                                                                                                                                                                   | Official, cross-platform                                                               |
| Other plugins               | autostart, notification, single-instance, store (app preferences), positioner (popover under the tray icon), dialog (pick the vault folder), log (one log file for Rust and all webviews); later updater (Phase 2) and deep-link (P2 URL scheme) | Official plugins                                                                       |
| Typed IPC                   | `tauri-specta` generates TypeScript bindings for every Rust command and event (exact-pinned, since v2 is a release candidate)                                                                                                                    | No hand-written `invoke` strings and no casts on results                               |
| Code quality                | ESLint (typescript-eslint strict type-checked, no `any`, no type assertions), Prettier, strict `tsconfig`, rustfmt, Clippy pedantic with restriction lints, knip, cargo-deny, lefthook, one `bun run check`                                      | Details in `docs/CONVENTIONS.md`                                                       |
| MCP                         | `@modelcontextprotocol/sdk` (TypeScript) over stdio                                                                                                                                                                                              | The reference SDK                                                                      |
| Index                       | In memory, built from the files at launch. No SQLite in Phase 1                                                                                                                                                                                  | Ten years is about 3,650 small day files; add a cache only if measurements require it  |
| Minimum macOS               | Phase 1: macOS 26                                                                                                                                                                                                                                | Personal use first                                                                     |
| Distribution                | Phase 1: local `tauri build`, installed in /Applications. Phase 2: notarized DMG built by `tauri-action`                                                                                                                                         | Section 14                                                                             |
| License                     | MIT, added in Phase 2                                                                                                                                                                                                                            | Simplest permissive license                                                            |

## 2. How the pieces fit

```
+------------------------------ ttime.app (Tauri) -------------------------------+
|                                                                                |
|  Webviews (TypeScript + React), each using @ttime/core with the TauriFs port   |
|    quickbar (always alive, also the "agent")     popover     main window       |
|                         |  invoke commands        ^  events                    |
|                         v                         |                            |
|  Rust layer: tray + title ticker, panels, global shortcut, vault_io commands,  |
|              file watcher, idle and power monitors, scheduler                  |
+-------------------------------------+------------------------------------------+
                                      |  lock + atomic writes
                                      v
                           <vault>/  (JSON files)
                                      ^
                                      |  lock + atomic writes
        ttime CLI and MCP server (Bun binary, @ttime/core with the NodeFs port)
```

The key idea: `@ttime/core` holds every rule and the whole storage format, and runs everywhere. In the app it runs inside each webview and reaches files through a few Rust commands; in the CLI and MCP server it runs on Bun with normal file access. Rust never interprets vault data; it only moves bytes, watches files, and reports system events.

## 3. Repository layout

```
ttime/
  package.json                     Bun workspaces and scripts (check, fix, dev, build, test)
  bunfig.toml
  tsconfig.base.json               strict compiler settings shared by every package
  eslint.config.ts                 one flat ESLint config for the whole repo
  .prettierrc.json
  knip.json
  lefthook.yml                     git hooks
  packages/
    core/                          @ttime/core
      bunfig.toml                  coverage thresholds
      src/
        schema/  model/            Zod schemas (schema 1), inferred types, ULID, slugs
        ports/                     FsPort, ClockPort, EnvPort, Logger, MemoryFs
        storage/                   repositories: paths, lock, atomic writer, reader,
                                   changelog, trash, validation, migrations
        domain/                    services: timer, entries, projects, clients, quick input
                                   parser, queries, reports, rounding, CSV export
        lib/                       time and money helpers, parseJson, constants
        errors.ts
        index.ts                   the package's public API
      test/integration/
      fixtures/vaults/             small sample vaults, including broken files
    cli/                           @ttime/cli (Bun)
      src/
        index.ts                   entry: CLI or MCP mode
        runtime/                   context, error handler, exit codes, output, logger
        commands/                  one file per command
        presenters/                human and JSON output
        mcp/                       server.ts and tools/ (one file per tool)
        adapters/node-fs.ts
      test/integration/
  apps/
    desktop/
      quickbar.html  popover.html  main.html
      vite.config.ts
      src/
        windows/                   one root per window: quickbar, popover, main
        features/                  quick-bar, timer, entries, projects, clients, calendar,
                                   analytics, export, settings, onboarding, monitors, shortcuts
        shared/
          ui/                      design-system primitives (wrapping Radix)
          bridge/                  generated tauri-specta bindings and thin wrappers
          adapters/                tauri-fs.ts, logger
          store/                   Zustand store on @ttime/core
          lib/                     runAction, cn(), formatting
          styles/tokens.css
        dev/                       browser dev mode (MemoryFs and a seeded vault)
      e2e/                         Playwright tests against the browser dev mode
      src-tauri/
        Cargo.toml  tauri.conf.json  capabilities/  icons/
        rustfmt.toml  clippy.toml  deny.toml  rust-toolchain.toml
        src/
          main.rs  lib.rs          entry and wiring
          error.rs  state.rs  events.rs
          commands/                IPC handlers: vault, windows, tray, monitors
          services/                vault_io, watcher, tray, panels, activation, scheduler
          platform/                capability traits; macos/ (idle, power, panel)
        tests/                     integration tests
  skills/ttime/SKILL.md            skill for AI clients (M3)
  docs/                            PRD, ARCHITECTURE, CONVENTIONS, DECISIONS, QA, phase-2/
```

What may import what, and how each layer is written, is defined in `docs/CONVENTIONS.md` (sections 5, 6 and 10).

## 4. Vault format (schema 1)

### 4.1 Layout

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

Only user data lives in the vault. Locks, caches and app preferences live outside it (sections 5.1 and 6.1).

### 4.2 Conventions

- UTF-8, pretty-printed, 2-space indent, keys sorted, trailing newline. Arrays in a deterministic order (entries by `start`, then `id`). This keeps git diffs minimal. (The examples below show content; real files have sorted keys.)
- Timestamps: ISO 8601 with seconds and the local UTC offset, for example `2026-11-08T09:30:00+02:00`. No fractional seconds.
- Durations are always computed from timestamps, never stored.
- Money: `{ "amount": "50.00", "currency": "EUR" }`. The amount is a decimal string handled with `big.js`. No floating point anywhere near money.
- IDs:
  - Client and project IDs are immutable slugs (`acme`, `acme-website`): unique, `[a-z0-9-]`, generated from the name at creation (with a numeric suffix on collision). Display names can change freely. Slugs keep files and entries readable for humans and AI.
  - Entry IDs are ULIDs (time-sortable, 26 characters).
- Unknown keys are preserved on rewrite (the Zod schemas pass unknown keys through) so hand-added fields and future fields survive.
- Every file carries `"schema": 1`.

### 4.3 Files

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

Trash: a deleted entry is written to `.trash/entries/<id>.json` with `deletedAt` and `deletedBy`, then removed from its day file. Clients and projects are archived, never deleted, in Phase 1.

### 4.4 Validation

The core's reader validates every file (with the Zod schemas) while loading:

- valid JSON with a known schema version;
- finished entries have `end > start`; no start more than a minute in the future;
- the referenced project exists (if not, the entry still loads and is flagged "unknown project");
- entry IDs are unique across the vault;
- each entry is in the right day file (if not, it is flagged and fixable in one click).

Problems become `VaultIssue` objects (file, JSON path, message, severity). The app shows them in a banner and an Issues view; the CLI prints them with `ttime doctor`.

**A file that failed to parse is never rewritten** until it parses again. Operations that would touch it fail with a clear error.

Overlapping entries are allowed and reported as warnings.

### 4.5 Migrations

The migrations module maps schema N to N+1. When the app opens a vault with an older schema it explains what will change, writes a zip backup next to the vault, then migrates. A vault with a newer schema than the app understands opens read-only.

## 5. @ttime/core

Pure TypeScript. No DOM, Node, Bun or Tauri imports; everything platform-specific comes in through ports, so the same code runs in the webviews, the CLI, the MCP server and tests.

```ts
interface FsPort {
  readText(path: string): Promise<string | null>; // null when missing
  writeAtomic(path: string, text: string): Promise<void>; // temp file, fsync, rename
  appendLine(path: string, line: string): Promise<void>;
  list(dir: string): Promise<{ name: string; isDir: boolean }[]>;
  mkdirp(path: string): Promise<void>;
  mkdirExclusive(path: string): Promise<boolean>; // false if it already exists
  remove(path: string, opts?: { recursive?: boolean }): Promise<void>;
  stat(path: string): Promise<{ mtimeMs: number; size: number } | null>;
}

interface ClockPort {
  now(): Temporal.ZonedDateTime;
}

interface EnvPort {
  platform: 'macos' | 'windows' | 'linux';
  homeDir: string;
  configDir: string; // see 5.1
}

interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}
```

Adapters: `NodeFs` (Bun, in `packages/cli`), `TauriFs` (calls the Rust `vault_io` commands, in `apps/desktop`), `MemoryFs` (tests and the browser dev mode, in core).

### 5.1 Storage

- **Config file:** `~/.config/ttime/config.json` on macOS and Linux, `%APPDATA%\ttime\config.json` on Windows, containing `{ "vault": "/absolute/path" }`. The app writes it when the vault is chosen; the CLI and MCP server read it. Overrides: `--vault` flag, then `TTIME_VAULT`.
- **Lock:** one protocol, implemented once in core on top of `mkdirExclusive`. The lock is a directory at `<configDir>/locks/<sha256 of the canonical vault path>.lock`. Acquire by creating it and writing `owner.json` (pid, actor, timestamp) inside; refresh `owner.json` every 2 seconds while held; a lock not refreshed for 10 seconds is stale and may be removed. Held only for one read-modify-write (milliseconds). Readers never lock; atomic renames mean they always see complete files.
- **Writer:** every mutation is a transaction: acquire the lock, re-read the affected files from disk (never trust caches), apply the change, validate with Zod, write with `writeAtomic`, append the changelog, release. It returns the written paths and content hashes.
- **Reader:** loads a `VaultSnapshot` (config, clients, projects, entries by day, running entry, issues), reading day files concurrently. Supports partial loads (`since` a date) for the lighter windows.

### 5.2 Domain

- `TimerService`: `start`, `stop`, `switchTo`, `pause`, `resume`, `addNote`, `discard`, `editRunning`. Enforces one running entry, gapless switching, and backdating rules: a backdated start may not precede the end of the previous entry; if it would, the caller chooses between trimming the previous entry and cancelling.
- `EntryService`: create, update, move, split, merge, delete (to trash), restore.
- `ProjectService` and `ClientService`: create (with slug generation), update, archive, unarchive.
- `QuickInputParser`: turns quick bar or CLI text into `{ description, projectQuery?, tags, start (now, offset or clock time), billable? }`.
  - Tokens: `@word` project, `#word` tag, `-20m`, `-1h`, `-1h15` or `-90m` to backdate, `at 9:30` or `at 14:05` for a clock time, `$` billable, `!$` non-billable.
  - Tokens may appear anywhere; the remaining text, whitespace-normalized, is the description.
  - Project resolution: exact slug, then exact name, then fuzzy (prefix and subsequence scoring). Returns ranked candidates for the UI.
- `QueryService`: entries by range, project, client, tag and text.
- `ReportService`: totals and breakdowns for a period. Splits entries at day boundaries using `dayStartsAt` and the current time zone; groups by project, client, day, tag or description; computes billable totals and amounts.
- `Rounding`: mode `none`, `up`, `down` or `nearest`; interval in minutes; scope `entry` or `day`. Used only inside reports and exports.
- `CSVExporter`: RFC 4180 quoting; configurable delimiter, decimal separator and BOM; `detailed` and `dailySummary` modes; the columns listed in the PRD. Notes are joined as `10:42 finished login flow | 11:05 started token refresh`.

### 5.3 Errors

A `TTimeError` class with a stable `code` and a user-facing message, so the CLI, MCP server and UI report the same problem the same way.

## 6. The Rust layer (`apps/desktop/src-tauri`)

Small and stable. It holds no product rules and never parses vault data. Module structure (commands, services, platform), errors, logging and lints follow `docs/CONVENTIONS.md` section 10.

### 6.1 Setup

- On macOS the app starts with the `Accessory` activation policy (no Dock icon). `activation.rs` switches to `Regular` while the main window is open and back when it closes.
- Plugins: global-shortcut, autostart (LaunchAgent on macOS), notification, single-instance, store, positioner, dialog.
- `macOSPrivateApi` is enabled for transparent windows with a vibrancy material.
- App preferences (hotkeys, menu bar display, idle threshold, reminders, window state) live in the store plugin's JSON file in the app config directory. Vault-level settings live in `ttime.json`.

### 6.2 `vault_io` commands

`vault_read_text`, `vault_write_atomic`, `vault_append_line`, `vault_list`, `vault_mkdirp`, `vault_mkdir_exclusive`, `vault_remove`, `vault_stat`.

- Every path is canonicalized and must be inside an allow-list: the current vault root and the ttime config directory. Anything else is rejected.
- `vault_write_atomic` writes a temp file in the same directory, calls `sync_all`, then renames over the target.
- These are the only file commands exposed to the webviews; the generic fs plugin is not enabled.

### 6.3 Watcher

`notify` with `notify-debouncer-full` (150 ms) on the vault root. Emits `vault:changed { paths }` to every window. Restarted when the vault changes.

### 6.4 Tray

- Icon: a template (monochrome) icon when idle; a generated dot in the project color while tracking.
- Title: the elapsed time next to the icon, updated by a Rust ticker (every second if seconds are shown, otherwise on minute boundaries). Rust keeps a `RunningSummary { start, projectName, color }` that the agent webview pushes with `set_running`; Rust does not read vault files for this.
- Left click toggles the popover, positioned under the tray icon. Right click shows a native menu (Stop, Pause, New, Open ttime, Quit) whose items emit events handled by the agent webview.
- Default to `h:mm` in the title; if digit width makes the menu bar jitter with seconds on, keep seconds off by default.

### 6.5 Panels and windows

- **Quick bar:** created at launch and kept hidden. Converted to an `NSPanel` with `tauri-nspanel`: can become key, non-activating, floating level, joins all Spaces and full-screen Spaces, transparent with a vibrancy material behind the webview. `show_quickbar(mode)` places it in the upper third of the screen under the cursor, shows it and gives it focus; hiding it returns focus to the previously active app.
- **Popover:** the same mechanism, positioned under the tray icon; created on first use, then kept hidden.
- **Main window:** an ordinary Tauri window created on demand and destroyed on close.

### 6.6 Monitors and scheduler

Anything that must fire on time lives in Rust, because timers inside hidden webviews can be throttled.

- `platform/macos/idle.rs`: while tracking, reads the system idle time every 30 seconds (`CGEventSourceSecondsSinceLastEventType` on macOS through `objc2`) and records the last input time.
- `platform/macos/power.rs`: sleep and wake (`NSWorkspace` notifications) and screen lock and unlock (the `com.apple.screenIsLocked` and `com.apple.screenIsUnlocked` distributed notifications).
- `services/scheduler.rs`: forgotten-timer threshold, daily auto-stop time, tracking reminders during working hours, end-of-day review. Driven by a `MonitorSettings` value the agent webview pushes with `set_monitor_settings`.
- Each emits an event (`monitor:idle-returned`, `monitor:forgotten-timer`, `monitor:auto-stop`, `monitor:reminder`, `monitor:review`) to the agent webview, which decides what to do and acts through the core.
- Each capability sits behind a small Rust trait with a macOS implementation, so Phase 3 can add Windows and Linux versions without touching callers.

## 7. The webviews (`apps/desktop/src`)

Folder structure, component rules and error handling follow `docs/CONVENTIONS.md` sections 5 to 7.

### 7.1 Windows and roles

| Window   | Lifetime                                | Loads                                                     | Role                                                                                                                                                                                                    |
| -------- | --------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| quickbar | Created at launch, never destroyed      | Clients, projects, running entry, last 60 days of entries | The quick bar UI, and the **agent**: registers hotkeys, pushes `set_running` and `set_monitor_settings` to Rust, handles monitor and tray menu events, shows prompts (idle resolution, forgotten timer) |
| popover  | Created on first open, then kept hidden | Running entry, today and this week                        | Menu bar popover                                                                                                                                                                                        |
| main     | Created on demand, destroyed on close   | Whole vault                                               | Today, Calendar, Projects, Analytics, Issues, Settings                                                                                                                                                  |

- Each window has its own Zustand store built on `@ttime/core` with `TauriFs`.
- Every write goes through the core. All windows, including the one that wrote, refresh from `vault:changed`, re-reading only the changed files.
- The agent pushes `set_running` right after any running-state change, local or external (CLI, MCP, hand edit), so the menu bar title is always current.

### 7.2 Quick bar

- Built with `cmdk`: an input with live token highlighting (`@project` shown as a colored chip), a list of recent unique entries and project matches, shortcut hints in the footer, and the ⌘K action panel.
- Keys as in PRD 6.1: ↑ and ↓, Enter, ⌘Enter, ⌘., ⌘P, ⌘E, ⌘O, ⌘K, ⌘1 to ⌘9, Esc.
- Modes: `new` (default), `note`, `edit-running`, `idle-resolution`, `forgotten-timer`.
- Appears in under 150 ms because the panel and its webview already exist.

### 7.3 Menu bar popover

Contents as in PRD 6.2: running entry with notes, Stop, Pause and Resume, Add note, New or Switch (opens the quick bar), recent and favorite entries started in one click, today and week totals.

### 7.4 Main window

- Sidebar: Today, Calendar, Projects, Analytics, plus Issues when the vault has problems. Settings open with ⌘,.
- **Calendar week view:** a custom React component using pointer events, with day columns and a time axis. Drag on empty space to create, drag edges to resize, drag the block to move (snap to 5 minutes, hold ⌥ for 1 minute), ⌥-drag to duplicate. Every gesture ends in exactly one core call, so it is logged and undoable.
- **Undo:** ⌘Z and ⇧⌘Z through changelog batches. An Activity list shows recent CLI and MCP batches with an Undo button.
- **Analytics:** Recharts charts and tables; every number comes from `ReportService`, the same code the CLI and exports use.
- **Settings:** hotkey recorder (captures a key combination and registers it through the plugin), menu bar display, vault location, working hours, idle threshold, reminders, rounding and CSV defaults, launch at login.

### 7.5 Design

- Launcher-inspired: the system font stack (`-apple-system`, so SF Pro on macOS), `font-variant-numeric: tabular-nums` on every time, warm neutral surfaces with project colors as the main color and one app accent (Ember, Jade or Iris; DEC-85), light and dark through `prefers-color-scheme`.
- Transparent windows with a native vibrancy material behind the webview; the UI draws subtle translucent surfaces on top. Apple's Liquid Glass can't be rendered inside a webview, so the look is "native material behind a clean web UI".
- Design tokens in one CSS file; shared components in `shared/`.

### 7.6 Browser dev mode

`bun run dev:web` runs the UI in a normal browser with `MemoryFs` and a seeded vault, without Tauri. Used for fast UI iteration and for Playwright tests.

## 8. CLI and MCP server (`packages/cli`)

One Bun program using `@ttime/core` with `NodeFs`, compiled to a single binary with `bun build --compile`.

### 8.1 CLI (M3)

```
ttime status [--json]
ttime start "<text>"                  same syntax as the quick bar
ttime switch "<text>"
ttime stop [--at 17:30]
ttime pause
ttime resume
ttime note "<text>"
ttime add --project acme-website --start 2026-11-07T14:00 --end 2026-11-07T16:00 --desc "auth review"
ttime add --project acme-website --date yesterday --duration 2h --desc "auth review"
ttime ls [--from --to --project --tag --json]
ttime report [--from --to --group project|day|tag|description --rounding nearest:15 --json]
ttime export --project acme-website --from 2026-10-01 --to 2026-10-31 [--mode detailed|daily] [--out path]
ttime projects [list|add|edit|archive]
ttime undo [--batch <id>]
ttime doctor                          validate the vault and print issues
ttime mcp                             run the MCP server on stdio
ttime dev seed --years 10 --vault /tmp/ttime-bench    synthetic data for benchmarks
```

Global flags: `--vault`, `--json`, `--dry-run`. Human-readable output by default, JSON with `--json`.

### 8.2 MCP server (M3)

- `@modelcontextprotocol/sdk` with the stdio server transport.
- Tools: `status`, `list_projects`, `create_project`, `update_project`, `start_timer`, `stop_timer`, `add_note`, `list_entries`, `add_entry`, `update_entry`, `delete_entry`, `restore_entry`, `summary`, `export_csv`, `undo`. Input schemas are the Zod schemas from core; results are JSON.
- Inputs use ISO 8601 timestamps with offsets; a `tz` argument defaults to the system time zone. Relative phrases ("yesterday afternoon") are resolved by the model.
- Every write tool accepts `dry_run` and returns the exact changes. A write affecting more than 3 records returns a preview and needs a second call with `confirm: true`.
- Every write is logged with `actor: "mcp"` and a batch ID; results include the batch ID so the model can offer undo.
- Tool descriptions state the conventions: one running timer, rounding only in exports, nothing hard-deleted, project IDs are slugs.

Phase 1 install and registration (Claude Desktop or Claude Code), using the absolute path:

```
bun run build:cli        # builds ~/.local/bin/ttime
```

```json
{ "mcpServers": { "ttime": { "command": "/Users/<you>/.local/bin/ttime", "args": ["mcp"] } } }
```

### 8.3 Skill

`skills/ttime/SKILL.md` explains what ttime is, the vault model, which tool to use when, the conventions above (including confirming bulk edits), and worked examples: "add 2 hours yesterday for X", "how do my hours look for X this week", "move this morning's entries to project Y", "export last month for Acme".

## 9. Performance budget

| Operation                                                | Budget                                              |
| -------------------------------------------------------- | --------------------------------------------------- |
| Quick bar visible after the hotkey                       | under 150 ms                                        |
| Start or switch persisted to disk                        | under 50 ms                                         |
| Cold vault load in the main window, 1 year               | under 300 ms                                        |
| Cold vault load in the main window, 10 years (synthetic) | under 1 s                                           |
| Analytics refresh for one month                          | under 100 ms                                        |
| CPU while a timer runs                                   | effectively zero (one Rust tick per second at most) |
| Memory with all windows hidden                           | under 200 MB in total                               |

Benchmarks use `ttime dev seed`. If the 10-year load exceeds 1 second, add a summary cache outside the vault keyed by file modification times. The vault format does not change.

## 10. Testing

Test layout and rules: `docs/CONVENTIONS.md` sections 9 and 10.5.

- **Core** (`bun test`): parser tokens and edge cases; timer transitions (gapless switch, backdating, pause and resume); day splitting with `dayStartsAt` and daylight saving changes; rounding modes and scopes; CSV quoting, delimiters, decimal separators and BOM; money math.
- **Storage** (with `MemoryFs` and with real temp folders through `NodeFs`): atomic writes never leave partial files; stop crash recovery (same entry in `running.json` and a day file); unknown keys preserved; broken files never overwritten; two Bun processes writing at the same time lose nothing; stale lock recovery.
- **Golden vaults** in `packages/core/fixtures/vaults/` with expected report and CSV outputs.
- **CLI:** snapshot tests of `--json` output against fixtures. **MCP:** an in-process client calls every tool, including the dry-run and confirm flow.
- **Rust:** `cargo test` for the `vault_io` allow-list and atomic writes, and for scheduler logic with a fake clock.
- **UI:** component tests with `bun test` and happy-dom, plus Playwright against the browser dev mode. Tauri's WebDriver testing doesn't support macOS, so the native shell (panels, tray, hotkey, monitors) is covered by a manual checklist in `docs/QA.md` for each milestone.

## 11. Phase 1 build and install

- Requirements: Xcode Command Line Tools, Rust through rustup, Bun.
- Top-level scripts:
  - `bun install`
  - `bun test` (core, CLI, UI) and `bun run test:rust`
  - `bun run dev` (`tauri dev`) and `bun run dev:web` (browser dev mode)
  - `bun run build:app` (`tauri build`, producing `ttime.app` with the CLI inside it as a sidecar, see DEC-87) and `bun run install:app` (copies it to /Applications)
  - `bun run build:cli` (compiles the CLI and MCP server to `~/.local/bin/ttime`)
- Signing: a build made on this Mac runs on this Mac without notarization. Set `bundle.macOS.signingIdentity` to the owner's Apple Development identity (or `-` for ad hoc) through a git-ignored local config, never committed.
- No network access: no http plugin, and a content security policy that only allows the app's own assets.

## 12. Phase 1 build order (for the coding agent)

Each step ends with passing tests and a short note on what can be demoed.

1. **Scaffold:** Bun workspaces, `packages/core`, `packages/cli`, the Tauri app with three window entries, a tray icon with a static title, the `Accessory` policy, `.gitignore`. Set up all quality tooling from `docs/CONVENTIONS.md` now (strict tsconfig, ESLint, Prettier, knip, lefthook, rustfmt, Clippy lints, cargo-deny, cargo-machete, tauri-specta bindings, tauri-plugin-log) so `bun run check` is green from the first commit.
2. **Core model and storage:** Zod schemas, ports, `MemoryFs` and `NodeFs`, lock, writer, reader, changelog, trash, validation, fixtures and tests.
3. **Domain:** `TimerService`, `QuickInputParser`, `EntryService`, `ProjectService`, `ClientService`, with tests.
4. **Rust file layer and onboarding:** `vault_io`, watcher, the `TauriFs` adapter, choosing or creating the vault, writing the config file.
5. **Quick bar:** `tauri-nspanel` panel, global shortcut, `cmdk` UI, tokens, recent list, actions, ⌘K panel; the agent role and `set_running`.
6. **Menu bar:** tray title ticker, colored icon, popover, right-click menu.
7. **Main window:** Today and Projects views, entry, project and client editors, undo, Issues view.
8. **CSV export:** `ReportService`, `Rounding`, `CSVExporter`, the export sheet with rounding and locale options.
   8b. **Settings view** (⌘,): PRD 6.7, including the hotkey recorder and the menu bar display options (DEC-66).
9. **Calendar week view** with drag editing.
10. **Analytics view.**
11. **Monitors:** idle, power and scheduler in Rust; idle-resolution and forgotten-timer prompts in the quick bar.
12. **CLI**, then the **MCP server**, then the **skill**. Register the MCP server in Claude and run PRD scenario S9 end to end.
13. **P1 extras** as time allows: tracking reminders, favorites, targets, copy summary, invoiced periods, month and day views.

Steps 1 to 11 are PRD milestones M1 and M2 (v1). Step 12 is M3. Step 13 is M4.

## 13. Guardrails that keep Phase 2 and Phase 3 cheap

- `@ttime/core` never imports platform APIs; everything goes through ports.
- No hardcoded user paths: Tauri path APIs in Rust, `EnvPort` in TypeScript.
- macOS-specific Rust code lives behind `#[cfg(target_os = "macos")]` and a trait per capability (panel, idle, power, tray title).
- Signing settings come from environment variables or a git-ignored local config; nothing secret is committed.
- The vault schema is versioned and validated from day one.
- Prefer standard CSS. Windows uses WebView2 and Linux uses WebKitGTK, so avoid WebKit-only features without a fallback.
- The CLI stays a self-contained Bun binary so it can later ship inside the app as a sidecar.

## 14. Phase 2: sharing and open source

Phase 2 starts once Phase 1 is in daily use. Everything here is additive.

### 14.1 Signing and notarization

- Developer ID Application certificate. The Tauri bundler signs and notarizes during `tauri build` when these environment variables are set: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, and an App Store Connect API key as `APPLE_API_ISSUER`, `APPLE_API_KEY`, `APPLE_API_KEY_PATH`.
- Why it matters: since macOS 15, an unnotarized app can only be opened through System Settings > Privacy & Security > Open Anyway.
- The CLI ships inside the app as a sidecar: compiled with `bun build --compile` to `src-tauri/binaries/ttime-<target-triple>` and listed in `bundle.externalBin`. Verify it is signed with Hardened Runtime inside the notarized bundle.

### 14.2 Release pipeline

- `tauri-apps/tauri-action` on a macOS runner, triggered by a `v*` tag: install, test, compile the CLI sidecar, build, sign, notarize, then attach the DMG and the updater files to a draft GitHub Release. Reference skeleton: `docs/phase-2/release.yml`.
- Secrets: the certificate (`.p12`, base64) and its password, the signing identity name, a keychain password, the App Store Connect API key (`.p8` base64, key ID, issuer ID), and the Tauri updater signing key and password.
- CI on every push: `bun test`, `cargo test`, and an unsigned build. Pull requests from forks only get unsigned builds.

### 14.3 Homebrew

- Start with an own tap (`<owner>/homebrew-tap`, installed with `brew install --cask <owner>/tap/ttime`); the release workflow updates the cask.
- Notarization is mandatory here too: Homebrew disables casks that fail Gatekeeper checks.
- Consider the official homebrew/cask repository once the project meets its notability rules.

### 14.4 Updates

- `tauri-plugin-updater`, with update files signed by a Tauri signing key (`TAURI_SIGNING_PRIVATE_KEY`) and a `latest.json` manifest published with each GitHub Release.
- The update check is the **only** network call the app may ever make, and it is opt-in: asked once on first launch, with a toggle in Settings. The content security policy and capabilities allow only that endpoint. Homebrew users can leave it off and use `brew upgrade`.

### 14.5 Wider macOS support

- Evaluate lowering the minimum to macOS 15.
- Ship Apple silicon only unless there is demand; a universal build is one `--target universal-apple-darwin` away.

### 14.6 Onboarding and setup for other users

- First-run flow: create or pick a vault (with an optional sample project), record the hotkey, enable launch at login; notification permission is requested when first needed.
- Settings > AI: "Install command line tool" (symlink from the bundled sidecar into `~/.local/bin`), "Copy MCP config" (with the absolute path inside the bundle), "Reveal skill" (to add `SKILL.md` to an AI client).
- "Copy diagnostics": app and macOS versions, vault schema version, recent errors and issues. Nothing leaves the Mac unless the user pastes it somewhere.

### 14.7 Open source project

- License: MIT, with a `LICENSE` file naming the copyright holder.
- `docs/FORMAT.md`: the vault format as a public contract, with schema versions and migration notes.
- README with screenshots and install options, CONTRIBUTING (building with your own signing identity or ad hoc), CHANGELOG, a short privacy statement, issue templates.
- Final product name, an app `identifier` (bundle ID) under a domain the owner controls, and a name check on GitHub and Homebrew.
- Publish from the Apple Developer account whose name should appear as the developer.

## 15. Phase 3 (optional): Windows and Linux

Most of the app carries over unchanged: the core, CLI, MCP server, vault format and React UI. The work is in the system layer.

| Piece                           | Windows                                                                                             | Linux                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Core, CLI, MCP, vault, React UI | As is; test the UI in WebView2                                                                      | As is; test the UI in WebKitGTK                                                      |
| Quick bar panel                 | Frameless, always-on-top window that skips the taskbar; focus return handled manually               | Same idea; behaviour varies by window manager                                        |
| Menu bar timer                  | Tray titles are unsupported: show the elapsed time in a dynamically drawn tray icon and the tooltip | The title only shows next to an icon, and display depends on the desktop environment |
| Global hotkey                   | Supported by the plugin                                                                             | Works on X11; on Wayland it depends on the compositor                                |
| Idle, sleep, lock               | Win32 APIs (or the `user-idle` crate)                                                               | `user-idle` crate and D-Bus (logind, screensaver)                                    |
| Window material                 | Mica or Acrylic through Tauri window effects                                                        | None; solid background                                                               |
| Signing                         | An Authenticode code signing certificate (separate purchase)                                        | Not required for AppImage or .deb                                                    |
| Paths                           | `%APPDATA%\ttime` for config and locks                                                              | `~/.config/ttime`                                                                    |

## 16. Open questions

1. Final product name (affects the app identifier, binary name and Homebrew cask).
2. Default quick bar hotkey: ⌥⇧Space is proposed; confirm it doesn't clash with existing shortcuts on the owner's Mac.
