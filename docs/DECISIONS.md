# Decisions

Deviations from the PRD, ARCHITECTURE and CONVENTIONS, lint and tool exceptions, and choices made
where the docs were ambiguous. Newest last. Each entry says what, why, and where.

## Step 1: Scaffold (2026-11-08)

### DEC-01 TypeScript 6.0.3, not 7.0.2

TypeScript 7.0.2 is the latest release, but typescript-eslint 8.72.1 (latest) supports
`typescript >=4.8.4 <6.1.0`. The type-checked lint rules are a core convention, so the repo pins the
newest compatible compiler, 6.0.3. Revisit when typescript-eslint supports 7.

### DEC-02 eslint-plugin-jsx-a11y on ESLint 10

eslint-plugin-jsx-a11y 6.10.2 (latest) declares peer support up to ESLint 9. It loads and runs on
ESLint 10.14.0 without errors. Kept because CONVENTIONS requires it.

### DEC-03 tauri-specta pins

`tauri-specta =2.0.0-rc.26` requires `specta =2.0.0-rc.26` and `specta-typescript ^0.0.13`, so
those are pinned exactly (`specta-typescript =0.0.13`), even though newer specta RCs exist.
`specta` is a direct dependency only because `collect_commands!` expands to `::specta` paths;
cargo-machete cannot see that, so it is listed in `[package.metadata.cargo-machete] ignored`.

### DEC-04 cargo-deny scope and exceptions

- Only `aarch64-apple-darwin` and `x86_64-apple-darwin` are checked (Phases 1 and 2 are macOS only).
- MPL-2.0 reaches the app only through Tauri (`cssparser`, `cssparser-macros`, `dtoa-short`,
  `selectors` via tauri-utils, `option-ext` via dirs). It is allowed per crate, not globally. The
  crates are used unmodified, which MPL-2.0 permits in an MIT app.
- RUSTSEC-2024-0436 (`paste` is unmaintained, not vulnerable) is ignored. It is a build-time macro
  pulled in by tauri-specta.
- Duplicate crate versions are reported as warnings, not errors. Tauri's own tree has unavoidable
  duplicates (`syn`, `hashbrown`, `getrandom`, `base64`, ...).

### DEC-05 knip ignores `tailwindcss`

Tailwind v4 is loaded by `@import 'tailwindcss'` in `tokens.css`. knip does not follow CSS
imports, so `tailwindcss` is listed in `ignoreDependencies` for `apps/desktop`.

### DEC-06 `errors.ts` and `constants.ts` live in `packages/core/src/lib/`

ARCHITECTURE shows them at `src/`. eslint-plugin-boundaries v7 classifies folders, not single
files, so they sit in `lib/` (the lowest layer) and `src/index.ts` is the only file at the root.

### DEC-07 Split tsconfigs for core

`packages/core/tsconfig.src.json` keeps `"types": []` for source files, as CONVENTIONS requires.
`tsconfig.test.json` adds Bun types for `*.test.ts` only. Both are built by `tsc -b`.

### DEC-08 Bindings regeneration and drift test

`bun run --cwd apps/desktop gen:bindings` writes the bindings through an ignored Rust test, without
launching the app. `tauri dev` also regenerates them. A normal `cargo test` fails when the committed
file differs from what the commands generate.

### DEC-09 Placeholder bundle identifier

`com.sandut.ttime`. The final name and identifier are open questions (PRD section 13). Kept for
local use (confirmed 2026-11-08).

### DEC-10 Step 1 tray menu

The tray shows the static title `ttime` and a menu with Quick Bar, Popover, Open ttime and Quit, so
all three window entries can be opened before the quick bar (step 5) and menu bar (step 6) exist.
The quick bar and popover are ordinary hidden windows until step 5 turns them into panels.

### DEC-11 Prettier formats the docs

CONVENTIONS says Prettier formats Markdown and YAML, so `docs/` was reformatted in the first
commit (table alignment, quote style in code samples). Content is unchanged.

### DEC-12 Temporary `--pass-with-no-tests`

Step 1 had no TypeScript tests, so `bun test` ran with `--pass-with-no-tests`. Removed in step 2.

## Step 2: Core model and storage (2026-11-08)

### DEC-13 One sanctioned `JSON.parse`

`packages/core/src/lib/json.ts` is the wrapper that the `no-restricted-properties` ban points to,
so it has the only inline disable in the repo:
`eslint-disable-next-line no-restricted-properties -- parseJson is the wrapper the ban points to`.
It returns `unknown`.

### DEC-14 Ports beyond the ARCHITECTURE sketch

- `ClockPort.sleep(ms)`: core has no timer globals (ES2023 lib), and lock acquisition must wait.
- `EnvPort.pid`: recorded in the lock owner file, as section 5.1 asks.
- `IdGenerator` (`newId()`): services take `ids` (CONVENTIONS 4.4); `Math.random` is banned in
  core. `createUlidGenerator` makes monotonic ULIDs from injected random bytes.

### DEC-15 Lock refresh and stale lock breaking

- The owner file is refreshed while the holder works (before each file write of a commit) instead
  of by a background timer. A hung holder then goes stale and can be recovered, which a timer would
  hide. Transactions take milliseconds, far below the 10 second stale limit.
- Breaking a stale lock happens under a second directory, `<lock>.breaking`, created with
  `mkdirExclusive`. The breaker re-checks that the same owner is still stale before removing it, so
  two processes can't both break it and delete a fresh lock. A breaker left by a crash is removed
  once it is older than the stale limit.
- Release only removes the lock if the owner token is still ours; otherwise it logs an error.

### DEC-16 SHA-256 and UTF-8 in plain TypeScript

The lock name and written-file hashes need SHA-256, and core has no crypto or `TextEncoder`
(ES2023 only). `lib/sha256.ts` and `lib/utf8.ts` are small implementations tested against FIPS
vectors and the standard encoder. They are not used for anything security-sensitive.

### DEC-17 Transactions enforce read-before-write

A transaction can only write or remove a path it has read in the same transaction, and reading a
file that fails to parse throws `vault.parse_failed` (or `vault.read_only` for a newer schema).
Writes are buffered and applied after the callback succeeds, so a failing transaction writes
nothing. Data files are written before changelog lines: a crash in between loses a log line, never
data, and never logs a change that did not happen.

### DEC-18 Trash file shape

`.trash/entries/<id>.json` is `{ "schema": 1, "deletedAt", "deletedBy", "entry": { ... } }`, so the
entry keeps its own schema and restores unchanged. ARCHITECTURE only says the file has
`deletedAt` and `deletedBy`.

### DEC-19 Timestamps need a numeric offset

The schema rejects `Z` and fractional seconds. ARCHITECTURE 4.2 asks for the local offset and no
fractions; the date part of a timestamp then decides the day file without time zone lookups.

### DEC-20 Issue line numbers deferred

PRD D5 asks for file and line. Bun and WebKit's `JSON.parse` errors carry no position, so issues
report the file, the JSON path and the parser or schema message. Line numbers would need a small
JSON locator; deferred until the Issues view (step 7), where they will be added (confirmed
2026-11-08).

### DEC-21 Missing settings use defaults

Each key under `ttime.json` `settings` falls back to the documented default when absent, so a
hand-written minimal `ttime.json` still opens. The defaults are written back the next time the
config is saved.

### DEC-22 Real file system tests live in `packages/cli`

`NodeFs` lives in the CLI and core may not import Node, so the NodeFs contract, fixture, concurrent
writer and stale lock tests are in `packages/cli/test/integration/` and use temp directories only.
The concurrent test runs two Bun processes; the stale lock test kills a lock holder with SIGKILL
and waits for the 10 second stale limit.

### DEC-23 Fixtures are not formatted by Prettier

`packages/core/fixtures/vaults/` holds files in the exact byte format ttime writes. Prettier would
collapse short arrays and change that, so the folder is in `.prettierignore`.

### DEC-24 `no-unused-vars` with `ignoreRestSiblings`

Lets `const { end, ...running } = entry` drop a key. This is the rule's standard option, not a
disable.

### DEC-25 Core runtime dependencies

`zod` 4.6.7 (schemas) and `temporal-polyfill` 1.0.8 (time zones and offsets), both chosen in
ARCHITECTURE section 1. `big.js` is added with the money helpers in step 8.

### DEC-26 Duplicate IDs are reported, not repaired

Moving an entry between day files writes the new file first. A crash in between leaves the entry in
both files, which the reader reports as `entry.duplicate_id`. It is not repaired automatically.

## Step 3: Domain services (2026-11-08)

### DEC-27 Zero-length entries are discarded

The schema requires `end` after `start`. Stopping in the same second as the start, or discarding
such an entry, writes no entry and no trash file. The changelog still records the stop or delete
with the running entry as `before`.

### DEC-28 Backdating rules in detail

- With an entry running, a new start must be after the running entry's start; the running entry
  ends at the new start (`timer.invalid_start` otherwise).
- With nothing running, finished entries ending after the new start conflict. `onConflict:
'cancel'` (default) throws `timer.backdate_overlap` with the conflicts in `details`. `'trim'`
  ends them at the new start, but never trims an entry to nothing (it still throws).
- Conflicts are looked for in day files from the day before the new start through today, so an
  entry longer than about a day before the new start is not seen. The reader flags overlaps anyway.
- Starts and stops may be at most 60 seconds in the future (clock skew between processes).
- Changing the running entry's start uses the same rules.

### DEC-29 Discarding the running entry

Discard moves the running entry to `.trash/entries/<id>.json` with `end` set to the discard
time, so the trash file has a normal finished entry and can be restored like any other.

### DEC-30 `stop` completes an interrupted stop

If `running.json` names an entry already in its day file, `stop` returns that entry and clears
`running.json` instead of failing with `timer.not_running`. Every other operation clears it
silently in the same transaction.

### DEC-31 Manual entries

- Overlapping manual entries are allowed and flagged by the reader (PRD 6.3).
- An entry may not end more than 60 seconds in the future (`entry.invalid_range`).
- New time can't go to an archived project (`project.archived`). Existing entries of an archived
  project can still be edited.

### DEC-32 Merge and split

- Merge needs two or more entries of one project. The earliest entry keeps its ID, description and
  billable flag, the span runs from the earliest start to the latest end (gaps become tracked
  time), tags and notes are combined, and the other entries go to the trash.
- Split keeps the ID on the first part; notes go to the part their time falls in.

### DEC-33 Resume source

Resume copies project, description, tags and billable from the entry that ended last in the
newest non-empty day file.

### DEC-34 Quick input details

- For project, start and billable, the last token wins. Repeated tags are kept once.
- `at` is only a token when the next word is a valid `H:MM` or `HH:MM`; otherwise it stays in the
  description. `-1h15m` is accepted as well as `-1h15`.
- Project matching ignores case and accents. A prefix also matches any word of the name or the
  slug. Archived projects rank after active ones of the same match kind.

### DEC-35 Default project colors

A new project without a color takes the next color from an 8-color palette
(`PROJECT_COLORS`), by number of existing projects.

### DEC-36 Service dependencies

Services take `{ vault, ids, logger }` (project and client services only `{ vault, logger }`).
Time comes from the transaction (`tx.now`), so one operation uses one instant. Each service
logs its operation name and batch ID at `info`, never descriptions or names.

### DEC-37 `splitByDay` ships with the domain

Day splitting (midnight, `dayStartsAt`, DST) is a pure helper in `domain/split-by-day.ts`, tested
now as the build order asks, and used by `ReportService` in a later step.

## Before step 4 (2026-11-08)

### DEC-38 The pre-push hook clears `SDKROOT`

Apple's `/usr/bin/git` sets `SDKROOT` to the Command Line Tools SDK for hooks. On this machine that
SDK (27.2) is newer than the Xcode linker selected by `xcode-select`, so linking the Rust tests
fails inside the hook only. The hook runs `env -u SDKROOT bun run check` so rustc picks the SDK the
way it does in a normal shell.

### DEC-39 CLI backdate conflicts fail with a hint

When a backdated start overlaps earlier entries, the CLI fails with the conflicts listed and
suggests `--trim`. It never prompts.

### DEC-40 Manual runs may use `~/.config/ttime`

Manual runs may write the real CLI config folder `~/.config/ttime` (config, locks). Automated tests
still use temporary directories only.

## Step 4: Rust file layer and onboarding (2026-11-08)

### DEC-41 Who reads and writes `config.json`

The core owns the config file (`storage/app-config.ts`: schema, unknown keys kept, a broken file
is never overwritten), so the app and the CLI share one implementation. The webview writes it
through `TauriFs` after a vault is chosen. Rust reads only its `vault` key at launch, to restore
the allow-list and the watcher before any window asks; an unreadable file means onboarding.

### DEC-42 Allow-list and vault root rules

- Paths must be absolute with no `.` or `..` segments. They are resolved through symlinks
  (missing tails allowed), and a dangling symlink is rejected so a later write can't escape.
- The allowed roots themselves can't be removed with `vault_remove`.
- `vault_set_root` needs an existing folder that is neither `/` nor the home folder.
- Opening a folder that is not a vault restores the previous root.

### DEC-43 Vault commands are async

All file commands run as async Tauri commands, off the main thread, so a slow disk never blocks
the tray or panels.

### DEC-44 `FileStat` numbers

Specta forbids 64-bit integers, so `mtimeMs` and `size` are `f64`, which the bindings type as
`number | null`. `TauriFs` maps `null` (never produced in practice) to 0.

### DEC-45 Rust errors without a TypeScript twin

`io.failed`, `io.path_not_allowed` and `input.invalid` keep their code. Other Rust codes
(`platform.watcher`, `platform.tauri`, ...) become `platform.failed` with the original in
`details.rustCode`. `io.path_not_allowed` and `config.parse_failed` were added to the core codes.

### DEC-46 New Rust dependencies

`notify-debouncer-full` 0.7.0 (uses `notify` 8.2.2, licensed CC0-1.0, allowed per crate in
`deny.toml`) and `tauri-plugin-dialog` 2.8.4 for the folder picker. The dialog plugin depends on
the `tauri-plugin-fs` crate, but that plugin is not registered and no `fs:` permission is
granted; the capability only adds `dialog:allow-open`.

### DEC-47 Whole-snapshot reload for now

On `vault:changed` the main window reloads the whole snapshot. Re-reading only the changed files
comes with the per-window stores of steps 5 to 7.

### DEC-48 Onboarding scope

Step 4 onboarding is: create a vault (name plus folder) or open an existing one, then a vault
overview with counts and issues. The sample project, hotkey recording and launch at login from
ARCHITECTURE 14.6 come with the steps that add those features.

### DEC-49 UI error plumbing and desktop tests

`runAction`, a toaster and one error boundary per window (CONVENTIONS 7) were added now because
onboarding is the first UI with actions. Desktop unit tests run with `bun test` and have their
own `tsconfig.test.json`, like core.

## Step 5: Quick bar (2026-11-08)

### DEC-50 Project when the text has no `@project`

Every entry needs a project. Without `@project` the quick bar uses the running entry's project,
then the latest active project from history. With neither, it asks for `@project`. An `@query`
that matches nothing creates a project with that name (the row says so before Enter).

### DEC-51 The quick bar stays open after an action

The PRD says the quick bar is fully keyboard driven but not what happens after Enter. After a
start, switch, stop, pause, resume or edit it shows what happened (new entry with a live timer,
or what was logged) instead of closing. Enter on an empty input or Esc closes it; typing logs
another entry. A note keeps the quick bar in note mode with the running entry's notes listed, so
several notes can be added in a row. The input shows what Enter does (`Start ›`, `Switch ›`,
`Note ›`).

### DEC-52 List contents

With an empty input the list shows the latest recent entry (Enter continues it) and today's
entries with their times and total, to make missed time easy to fill in. While typing it shows
a start row and matching recent entries; while an `@query` is typed, project completions. Tab
copies a highlighted recent entry into the input.

### DEC-53 Errors in the quick bar

Errors show inside the quick bar, not as toasts, and clear when typing; Esc dismisses them. A
backdate overlap that trimming can fix offers "Trim the earlier entry and start anyway" as the
first row (or "press Enter again" in the edit form), using the core's `onConflict: 'trim'`. Toasts
in other windows close after 6 seconds. Core error messages show times as `HH:MM`, with the date
only when it is not today, instead of raw timestamps.

### DEC-54 Global shortcut registered in Rust

ARCHITECTURE 7.1 has the agent webview register hotkeys. The default ⌥⇧Space is registered in
Rust at launch instead, so it works before the webview loads and never depends on a hidden
webview's event loop. Making it configurable (Settings) will go through a Rust command. If the
shortcut is taken, the error is logged and the tray menu still opens the quick bar.

### DEC-55 Quick bar panel details

- The panel hides when it loses focus, like launchers, besides Esc.
- `tauri-nspanel` 2.1.1. Its macros generate no `unsafe` in our crate, so the panel code needs
  no `unsafe_code` exception; it lives in `platform/macos/panel.rs` with one
  `#[expect(clippy::unused_unit)]` the `panel_event!` grammar requires.
- Vibrancy uses Tauri's window effects (`Popover` material), which needs `macOSPrivateApi`.
- Panel operations run on the main thread through `run_on_main_thread`.

### DEC-56 Running summary in step 5

`set_running` stores the summary and the tray title shows the running project's name. The
elapsed-time ticker and the colored icon come with step 6.

### DEC-57 Deferred quick bar items

Favorites (⌘1 to ⌘9) are P1 (step 13). The `idle-resolution` and `forgotten-timer` modes come
with the monitors (step 11).

## Step 6: Menu bar

### DEC-58 Menu bar title and icon

- While tracking, the icon is a dot in the project color drawn in Rust (36 px RGBA) and the
  title is the elapsed `h:mm`. When idle, the template clock icon shows with no title.
- A Rust thread redraws the title on the running entry's minute boundaries and whenever
  `set_running` changes the summary. It never polls files.
- `RunningSummary.start` is now `startEpochSeconds`, so Rust needs no date parsing.
- Display options (project and time, icon only) and showing seconds wait for the Settings view (step 8b, DEC-66).
  Until then the title is time only, the PRD default.

### DEC-59 Tray clicks and menu

Left click toggles the popover under the icon. Right click shows Stop (or Resume when idle), New
Entry…, Add Note…, Open ttime, Quit. Stop and Resume go to the agent (quick bar webview) as a
`tray:action` event, so every vault write stays in the core. The menu is rebuilt when the
running state or the resume target changes.

### DEC-60 Popover

- The popover is a floating `NSPanel` like the quick bar (shared `FloatingPanel`), created on
  first click, kept hidden afterwards, and hidden when it loses focus.
- It loads 8 days of entries: this week plus one day for `dayStartsAt`.
- Today and This week totals come from core's `currentTotals`, which splits entries at report-day
  boundaries and counts the running entry up to now.
- Discard asks for a second click ("Confirm discard") instead of a dialog, to keep the panel
  keyboard and click friendly.
- Favorites wait for P1 (step 13), Settings for the Settings view (DEC-66). Recent entries (5) are startable in one
  click.

### DEC-61 No separate Pause in the UI

PRD 4 defines Pause as a stop, and core's `pause` is `stop`, so a Pause button next to Stop did
the same thing. The UI shows one action instead: Stop while tracking, and `Resume <description>`
(the project name when the description is empty) when idle, naming what Resume continues. This
applies to the popover and the tray menu. The quick bar drops ⌘P; Enter on the latest entry row
already continues it. Core `pause` and the CLI `ttime pause` stay as documented.

## Step 7: Main window

### DEC-62 Undo and redo

- ⌘Z reverts the latest `app` batch and ⇧⌘Z reverts the latest undo batch, computed by replaying
  the last two months of changelog (`undoState`). Quick bar, popover and main window changes all
  count, since they share the `app` actor. A new change clears redo.
- Undo applies `before` for every line of the batch, newest line first, in one new batch whose
  lines carry `undoes: <batch>` and the op of what the revert did (`create`, `update`, `delete`
  or `restore`). The changelog op list is unchanged.
- Before restoring, each record must still equal the batch's `after`. Otherwise the undo fails with
  `undo.conflict`, so a later edit (from the app, the CLI or a hand edit) is never lost.
- Nothing is hard-deleted: undoing an entry's creation moves it to the trash, and undoing a
  project or client creation archives it.
- The Activity list of CLI and MCP batches comes with the CLI (step 12), when such batches exist.

### DEC-63 Issue line numbers

`VaultIssue.line` comes from a small JSON scanner in core (`jsonProblemLine`): the line of the
first syntax error, or of the value at the issue's JSON path (its deepest existing parent for a
missing key). WebKit's `JSON.parse` errors carry no position, so the scanner is needed. Only files
that have issues are read a second time.

### DEC-64 Today view

- Rows are the entries that start on the day plus the running entry; totals split time at
  `dayStartsAt`, so an entry across midnight is listed on its start day but counted on both.
- Gaps of at least 5 minutes inside the working hours, never after now, show "Fill gap".
- Editing happens in place: click a row, Enter saves, Esc cancels. An end at or before the start
  means the next day. The running entry opens the quick bar's edit form instead.
- Deleting moves the entry to the trash with a toast that ⌘Z restores it.

### DEC-65 Projects view

- The list groups projects by client (no client last) with this week, this month and all time,
  split at report-day boundaries and including the running entry. Archived projects and clients
  show on request.
- Project detail lists the project's entries by day for this week, this month or all time, with
  the total and, when a rate is set, the amount (`amountFor`, big.js 7.0.1, half up to cents).
  Export CSV comes with step 8.
- `ProjectPatch` takes `null` for `client` and `rate` to remove them, since
  `exactOptionalPropertyTypes` rules out passing `undefined`.

### DEC-66 Deferred from the main window

- The Settings view (⌘,: hotkeys, menu bar display, week and day start, working hours and the
  rest of PRD 6.7) was in no build order step. It becomes step 8b, right after CSV export
  (ARCHITECTURE 12).
- Calendar and Analytics join the sidebar with steps 9 and 10.
- Split and merge exist in core but have no UI yet; the calendar (step 9) is their natural home.
