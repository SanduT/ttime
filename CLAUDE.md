# ttime

Local-first macOS time tracker. Tauri 2, TypeScript core and React UI, thin Rust shell, Bun.
Source of truth: `docs/PRD.md`, `docs/ARCHITECTURE.md` (vault format in section 4, build order in
section 12), `docs/CONVENTIONS.md`. Deviations and exceptions are logged in `docs/DECISIONS.md`.

## Commands

- `bun install` installs everything and the lefthook git hooks.
- `bun run check` is the gate: Prettier, rustfmt, ESLint (`--max-warnings 0`), `tsc -b`, Clippy
  (`-D warnings`), knip, cargo-deny, cargo-machete, `bun test` (core coverage 90% per file),
  `cargo test`. Run it before every commit. Never commit with failures, never `--no-verify`.
- `bun run fix` applies Prettier, `eslint --fix` and `cargo fmt`.
- `bun run dev` launches the app (`tauri dev`, Vite on port 1420).
- `bun run test` runs core (with coverage) and CLI tests. `bun run test:rust` runs `cargo test`.
- `bun run --cwd apps/desktop gen:bindings` regenerates `src/shared/bridge/bindings.ts`
  (tauri-specta). A Rust test fails when the committed bindings drift.
- Rust commands run from `apps/desktop/src-tauri` (the toolchain file lives there).
- Commits: Conventional Commits (`feat(core): ...`), checked by the `commit-msg` hook. Commit after
  each build-order step. Never add a co-author.

## Layout

```
packages/core     @ttime/core: schema, ports, storage, domain. Pure TypeScript, runs everywhere.
packages/cli      @ttime/cli: Bun CLI and MCP server, NodeFs adapter, real-fs integration tests.
apps/desktop      Tauri app. quickbar.html, popover.html, main.html; src/windows, features, shared.
  src-tauri       Rust shell: commands/ (IPC), services/ (tray, panels, activation), platform/.
eslint/           Layer and restriction rules used by eslint.config.ts.
```

Other packages import only `@ttime/core`, never deep paths.

## Layers (enforced by eslint-plugin-boundaries)

- core: `lib` (time, json, errors, constants) <- `schema` <- `ports` <- `storage` <- `domain` <-
  `index.ts`. Only `storage` knows file paths and JSON layout. `testing/` holds test builders.
- core bans `node:*`, `bun`, `@tauri-apps/*`, React, and the globals `Date`, `console`, `process`,
  `window`, `document`. `lib` is ES2023 only. Tests may import `bun:test` only.
- cli: `index` -> runtime, commands, presenters, mcp, adapters. Commands and tools return data and
  never print. Only `runtime/output.ts` and the logger write to stdout or stderr.
- desktop: `windows -> features -> shared -> @ttime/core`. Only `shared/bridge` and
  `shared/adapters` import `@tauri-apps/*`. Components never call `invoke` or hold business rules.
- Rust: commands are thin; services hold behaviour; all `unsafe` lives in `platform/macos`.

## Code rules

- No `any`, no `as` casts (`as const` is fine), no `!`. Outside data is `unknown` until Zod parses
  it. `JSON.parse` is banned; use core's `parseJson`. No `enum`, `namespace`, `for...in`.
- `type` aliases, named exports, kebab-case files, `readonly` data, factory functions with explicit
  dependencies (`createTimerService({ vault, clock, ids, logger })`). TSDoc on core exports.
- Time only through Temporal and core's time helpers. Durations are integer seconds. Money only
  through core's money helpers (decimal strings, big.js).
- Size limits: 300 lines per file, 80 per function, complexity 12. Split instead of disabling.
- Never disable a lint rule to pass. A truly needed exception uses the narrowest disable with a
  description and an entry in `docs/DECISIONS.md`. No `TODO` without a DECISIONS entry.
- Rust: no `unwrap`, `expect`, `panic!`, `println!`; `AppError` (thiserror) serialized as
  `{ code, message }`; exceptions via `#[expect(lint, reason = "...")]`.
- Pin exact versions for pre-1.0 and RC packages. Check latest stable versions, not memory.

## Errors and logging

- Core throws only `TTimeError` with a namespaced `code` (`vault.parse_failed`, `vault.locked`,
  `timer.already_running`, `input.invalid`, `io.*`, `platform.*`). Expected outcomes are values: a
  missing file is `null`, file problems are `VaultIssue`s.
- Errors are caught only at boundaries: CLI `runtime/handle-error.ts` (exit 1 user, 2 vault, 70
  internal), one MCP tool wrapper, UI `runAction()` plus one error boundary per window.
- One `Logger` port. Desktop forwards to tauri-plugin-log (one file for Rust and webviews); CLI
  writes JSON lines to stderr (`TTIME_LOG`, default `warn`); in MCP mode stdout is the protocol.
- Descriptions, notes and client names are logged only at `debug`.

## Testing

- Test-first for core. Unit tests sit next to the code (`x.test.ts`), use `MemoryFs`, a manual
  clock and builders, no real files or timers. One behaviour per test, behaviour-named.
- Real-fs tests (NodeFs, multiple processes) live in `packages/cli/test/integration/*.int.test.ts`
  and use temporary directories only. Never write outside the repo or a temp directory.
- Fixtures: `packages/core/fixtures/vaults/` (including broken files).
- Every doc rule has a test: gapless switching, backdating limits, stop crash recovery, broken
  files never overwritten, unknown keys preserved, concurrent writers, stale lock recovery, day
  splitting across midnight and DST.

## Vault invariants (schema 1)

- Layout: `ttime.json`, `clients/<slug>.json`, `projects/<slug>.json`,
  `entries/<yyyy>/<mm>/<yyyy-mm-dd>.json`, `running.json`, `changelog/<yyyy-mm>.jsonl`,
  `exports/`, `.trash/entries/<ulid>.json`. Locks, caches and prefs live outside the vault.
- Files: UTF-8, 2-space indent, sorted keys, trailing newline, `"schema": 1`. Entries sorted by
  `start` then `id`. Timestamps ISO 8601 with seconds and a numeric UTC offset, no fractions.
  Durations are never stored. Money is `{ amount: "50.00", currency: "EUR" }`.
- IDs: client and project IDs are immutable slugs; entry IDs are ULIDs.
- Unknown keys are preserved on rewrite. A file that fails to parse is never rewritten.
- An entry lives in the day file of the local date of its `start`. Day files are never deleted.
- At most one running entry. Starting stops the running one at the same instant (gapless).
  Backdating may not precede the previous entry's end. Raw times stored to the second; rounding
  only in reports and exports.
- Stop writes the day file first, then clears `running.json`; the same ID in both means the stop
  completed and `running.json` is cleared.
- Every write is a locked transaction: lock, re-read from disk, apply, validate, atomic write,
  append changelog (actor, op, kind, id, before, after, batch), release. Nothing is hard-deleted.
- The app makes no network calls. No em dashes in docs or UI text.
