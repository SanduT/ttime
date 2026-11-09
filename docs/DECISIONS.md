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

- The panel hides when it loses focus, like other launchers, besides Esc.
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

## Step 8: CSV export

### DEC-67 Report rows and rounding

- `reportRows` splits each finished entry at report-day boundaries (`dayStartsAt`, the current
  time zone), so an entry across midnight is two rows; each row keeps the notes written in its
  part. The running entry is not exported.
- Entry scope rounds each row. Day scope rounds the per-project day total, so it only changes the
  Daily summary; Detailed rows then show raw durations. Nearest rounds halves up.
- Rows of one project and day merge in the Daily summary, with billable and non-billable time
  apart, unique descriptions joined with `; `, and all notes and tags.
- The rate is the project's, else its client's default rate. Only billable time is priced; the
  amount is rounded seconds times the rate, half up to cents (big.js).

### DEC-68 CSV format

- The PRD columns plus a final `currency` column, since `rate` and `amount` are written as plain
  numbers (with the chosen decimal separator) so spreadsheets can sum them.
- Daily summary rows drop `start` and `end`. Times are wall-clock `HH:MM`, durations as decimal
  hours with two places and `h:mm`, tags joined with `, `, billable as `yes` or `no`.
- RFC 4180 quoting, CRLF line ends, optional UTF-8 BOM.
- Golden test: the `basic` fixture's expected exports live in `packages/core/fixtures/reports/`
  (excluded from Prettier, `-text` in `.gitattributes` to keep CRLF).

### DEC-69 Where exports go

Exports are written into the vault's `exports/` folder (PRD 6.6 and the vault layout), named
`<project or all-projects>_<from>_<to>_<mode>.csv`; a new export of the same name replaces the
old one. They are output, so they get no changelog line and no schema. The sheet shows the saved
path with Reveal in Finder (`vault_reveal`, limited to files inside the open vault, runs
`/usr/bin/open -R`), Open (`vault_open`, the file's default app) and Open exports folder. A save-anywhere dialog is left out because the webviews may only touch the
vault and config folders.

## Step 8b: Settings view

### DEC-70 App preferences in a typed `prefs.json`

App preferences live in `prefs.json` in the app config directory (outside the vault), owned by
Rust as a serde struct, instead of the store plugin (ARCHITECTURE 6.1). Rust needs them at launch
(hotkey, theme, menu bar title) and every one has a Rust effect, so a typed file with
`prefs_get` and `prefs_set` keeps them in one place; the store plugin's untyped JS API would
bypass the bridge. A broken file gives the defaults and is left alone until the next save.

- Quick bar shortcut: recorded in the view, applied by unregistering the old one and
  registering the new one; if the new one is taken, the old one is registered again and the
  error is shown.
- Menu bar while tracking: Time (default), Project and time (name cut at 20 characters), or Icon
  only; optional seconds, which tick the title every second.
- Appearance: System, Light or Dark, through `AppHandle::set_theme` for every window.
- Launch at login: `tauri-plugin-autostart` (LaunchAgent). Its state is read from the system,
  not stored. In `bun run dev` it registers the debug binary.

### DEC-71 Vault settings and switching vaults

- Week start, day start, working hours, default currency, rounding and CSV defaults are written to
  `ttime.json` by core's settings service: one locked transaction with a `config` changelog line,
  so ⌘Z undoes a settings change. Selects save at once; text fields save on blur or Enter.
- Open another vault… reuses onboarding. Rust now emits `vault:opened`, and every window (quick
  bar and popover too) reloads its vault on it.
- Settings opens from the sidebar, ⌘, in the main window, and Settings… in the tray menu.

### DEC-72 Settings that wait for the monitors

Idle threshold, forgotten-timer limit and auto-stop, and reminders configure the monitors of step 11. They join the Settings view with that step, so no setting exists without its behaviour.

## Step 9: Calendar week view

### DEC-73 Week layout

- Core's `weekView` lays out seven calendar days from the week start (`weekStartsOn`). Columns
  split at local midnight, not at `dayStartsAt`, because the grid shows wall-clock time; an
  entry across midnight is two blocks with square inner corners. The running entry grows to now
  and cannot be dragged.
- Overlapping entries sit side by side (first free column within a chain of overlaps), get a red
  ring and a ⚠, and the title says so (PRD: overlaps are visibly flagged).
- The grid shows a working-hours band, an hour scale (48 px per hour), and a red now line; it
  opens scrolled to an hour before the working day.

### DEC-74 Gestures

- Drag on empty space opens the entry dialog with the dragged times (choose a project, then Add).
  Drag a block to move it, also to another day; drag its top or bottom edge to resize; ⌥ held at
  the start of a block drag drops a copy. Snap is 5 minutes; holding ⌥ while dragging snaps to 1
  minute (ARCHITECTURE 7.3). A press that moves less than 4 px is a click and opens the editor.
- Every gesture ends in one core call (`create`, `move`, `update` with one edge, or `create` for
  a copy), so each is logged and ⌘Z undoes it. Moves and copies keep the exact duration; the
  edited edge snaps.
- The editor reuses Today's entry form in a dialog: project (move to another project), times,
  description, Delete. Blocks are buttons, so Tab and Enter open the editor without a pointer.
- ← and → change the week, T returns to this week.

## Step 10: Analytics

### DEC-75 Analytics numbers

- Analytics uses the vault's default rounding (Settings, Export defaults) and the same report
  code as the CSV export: report rows, then the daily summary. A test checks that its totals
  equal a Daily export with the same rounding, for entry and day scope (PRD acceptance 5). A note
  under the period says when rounding is on.
- Like the export, the running entry is not counted; the popover and Today show live time.
- The drill-down lists the project's entry parts per day with notes; durations there follow
  entry-scope rounding, so with day scope they show raw time while the totals are rounded.

### DEC-76 Period picker and charts

- Today, This week, Last week, This month, Last month, This year and Custom, with ← and → moving
  by the period's own length (a day, a week, a whole month, a year, or the custom length). The
  export sheet gains Today and This year too.
- Charts are plain elements styled with the app tokens (no chart library, no new dependency):
  horizontal bars per project, and per-day columns stacked by project in the same colors.
  Periods longer than a month label months instead of days.
- Export CSV opens the export sheet for the shown period, and for the drilled project when one
  is open.

## Step 11: Monitors

### DEC-77 How the monitors detect idle, sleep and lock

- One Rust thread ticks every 30 seconds and feeds a pure state machine (`services/monitor.rs`,
  tested with a fake clock). Idle time comes from `CGEventSourceSecondsSinceLastEventType`; the
  local UTC offset (for the auto-stop time) from `localtime_r`. Both FFI calls live in
  `platform/macos/idle.rs`, the only new `unsafe`. `libc` is now a direct dependency.
- Sleep is detected as a gap of more than 90 seconds between ticks, not through `NSWorkspace`
  notifications: the thread does not tick while the Mac sleeps, so the gap is exact and needs no
  Objective-C observers. A screen lock has no input, so it counts as idle time from the last input.
  This closes the idle part of DEC-72.
- The return is noticed within one tick (up to 30 seconds after the first input). The idle
  stretch runs from the last input to the first input after it.
- Defaults: idle after 10 minutes, a reminder every 4 hours, auto-stop off. 0 turns idle or the
  reminder off. They are app preferences (`prefs.json`), next to the other machine settings.

### DEC-78 What the monitors do

- Idle return and a forgotten timer open a prompt in the quick bar (ARCHITECTURE modes
  `idle-resolution` and `forgotten-timer`, one `prompt` mode here). There is no system
  notification and no notification plugin: the quick bar already gives choices with the keyboard,
  and it needs no permission. Keep (the first button) has focus and Esc keeps, so time is only
  removed by an explicit choice (PRD acceptance 6).
- Idle choices are one locked, undoable transaction in core (`createIdleService`): Discard ends
  the entry at the last input and continues the same entry at the return; Discard and stop only
  ends it; Assign also adds the idle stretch as an entry for the chosen project.
- Forgotten timer: Keep running, Stop at the last activity, or Stop now.
- Auto-stop is opt-in and has no prompt: once the set time has passed and there has been no
  input for 5 minutes (or the Mac slept through it), the timer stops at the last activity before
  that, not at the auto-stop time. Only entries started before that time are stopped.
- Tracking reminders (P1) remain for step 13.

## Step 12: CLI, MCP server and skill

### DEC-79 CLI

- Flags are parsed with `node:util` `parseArgs` (no dependency). Values are checked by core's
  parsers (dates, times, durations, money) and the CLI date helpers, which throw `input.invalid`,
  instead of per-command Zod schemas.
- The vault is `--vault`, else `TTIME_VAULT`, else the vault in `~/.config/ttime/config.json`
  (the app's). A missing vault is the new error `vault.not_set` (exit 2).
- `--dry-run` runs every transaction in full, validation included, through a vault created with
  `dryRun: true`, which writes no files and no changelog. The output lists the changes.
- `add` with a date and duration but no start begins after that day's last entry, or at the
  working-hours start on an empty day. `--period` (this-week, last-month, ...) is added next to
  `--from` and `--to`.
- `status` includes the running entry, like the popover; `ls`, `report` and `export` leave it out,
  like the CSV export. `report` by project or day equals a CSV export with the same rounding; by tag
  or description it rounds per entry, and an entry with several tags counts under each.
- `undo` without `--batch` reverts the latest CLI change. `export` prints the absolute path.
- Not built: `export --out` (copy the printed path instead) and `dev seed` (moved to step 13).
- `bun run build:cli` compiles `~/.local/bin/ttime`. It writes outside the repo, so it is run by
  hand.

### DEC-80 MCP server

- `ttime mcp` serves `@modelcontextprotocol/sdk` 1.32.2 over stdio with the 15 tools of
  ARCHITECTURE 8.2. Each tool is a Zod input shape plus a thin call into the same command functions
  the CLI uses, and results are JSON text. One wrapper (`mcp/run-tool.ts`) opens the vault per call
  (actor `mcp`), applies the write rules and turns errors into `{ code, message }` error results.
- Tool arguments are camelCase (`dryRun`, `groupBy`, `billingPeriod`, `includeArchived`) to match
  the codebase naming rule, instead of the snake_case in ARCHITECTURE 8.2.
- Writes: `dryRun` returns the changes without writing. Without `confirm`, a write first runs as a
  dry run; if it touches more than 3 records it returns `needsConfirmation` with the changes, else
  it runs for real. Results carry the batch IDs for `undo`.
- `tz` (IANA) applies to times without an offset and to "today"; default the system zone.
- `add_note` has no `at` and `add_entry` has no `notes`: core stamps notes when they are added
  to a running entry. `update_project` also archives and unarchives.
- SDK subpaths are imported without `.js` (`@modelcontextprotocol/sdk/server/mcp`), which both
  TypeScript and Bun resolve through the package's `./*` export; the ESLint resolver does not
  resolve the `.js` form.

### DEC-81 Skill

- `skills/ttime/SKILL.md` covers the data model, conventions, which MCP tool or CLI command to use,
  and the four worked examples of ARCHITECTURE 8.3. It prefers MCP and falls back to the CLI with
  `--json`, so it works in Claude Code without the MCP server.

## Fixes after step 12

### DEC-82 Panels open on the screen in use

- With several screens, the quick bar always opened on the main screen and the popover on the main
  screen even with the menu bar icon on another one. Cause: on macOS, Tauri's `cursor_position`
  scales the cursor by the main screen while `monitor_from_point` compares against screen bounds in
  points, so with a Retina main screen a point on another screen matched none and we fell back to
  the main screen.
- `services/screens.rs` converts every screen to points (Tauri reports each value as points times
  that screen's scale) and finds the screen under the cursor itself. The quick bar uses it; the
  popover uses it at click time, when the cursor is on the icon, and converts the icon's rect with
  that screen's scale.

### DEC-83 Opening the app by hand shows the main window

- The app started hidden whenever a vault was set, so opening ttime from Finder, Spotlight or the
  Dock only added the menu bar icon. Now the login item passes `--autostart` and only that launch
  stays in the menu bar; any other launch, and reopening the running app (`RunEvent::Reopen`),
  shows the main window.
- An enabled login item is rewritten at startup, so items created before this change get the
  argument.

### DEC-84 Bundle identifier and docs without product names

- The bundle identifier is `io.github.sandut.ttime`, a namespace owned through the GitHub account,
  so no domain is needed (open question 1 of ARCHITECTURE section 16 is settled for the ID).
  macOS keeps app preferences under the identifier, so `prefs.json` is copied once from the old
  `com.sandut.ttime` folder at startup.
- The docs no longer name proprietary products. Design references read "launcher-style", and the
  PRD's ideas table lists the ideas without where they were seen.

## UI refresh

### DEC-85 Theme tokens, accents and motion

- Warm neutral surfaces in three levels (surface, raised, solid) replace the pure grays; one accent
  marks focus, selection and the primary action. Ember is the default; Jade and Iris are themes in
  Settings > Theme. The accent is the `accent` pref; Rust emits `prefs:accent` on change and every
  window sets `data-accent` on its root, which switches the CSS variables.
- Motion: `motion` 14.10.1 (14.11.x was released the same day; the newest older patch is used),
  `@number-flow/react` 0.6.2 for rolling timer digits, `lucide-react` 1.70.0 for icons. Springs
  and short CSS keyframes only; `MotionConfig reducedMotion="user"` and a `prefers-reduced-motion`
  rule turn animation off when macOS Reduce Motion is on.

### DEC-86 Onboarding, main window and icon

- Onboarding is four screens (welcome, vault, shortcut, menu bar) shown on first run and from
  Settings > Vault > Welcome tour. ttime needs no macOS privacy permissions (the hotkey uses the
  Carbon API, idle time needs none, no notifications), so the only system choice is the login
  item. The shortcut step checks itself off when the quick bar opens: `quickbar:shown` is now
  emitted to every window instead of only the quick bar.
- The vault picker moved to `shared/hooks/use-vault-picker.ts` so Settings and onboarding share it
  without a feature cycle; the tour state is `shared/store/onboarding-store.ts`.
- Main window: sidebar icons, the running entry pinned above Settings, a relative day title, stat
  cards (tracked, untracked in working hours, entries), a project split bar and staggered rows.
  Targets ("22h / 30h") from the mockup wait for P1 targets.
- App icon: `src-tauri/icons/app-icon.svg` (source) rendered to `app-icon.png`, then
  `tauri icon`; only the macOS files are kept.
