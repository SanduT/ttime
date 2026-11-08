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

`com.sandut.ttime`. The final name and identifier are open questions (PRD section 13).

### DEC-10 Step 1 tray menu

The tray shows the static title `ttime` and a menu with Quick Bar, Popover, Open ttime and Quit, so
all three window entries can be opened before the quick bar (step 5) and menu bar (step 6) exist.
The quick bar and popover are ordinary hidden windows until step 5 turns them into panels.

### DEC-11 Prettier formats the docs

CONVENTIONS says Prettier formats Markdown and YAML, so `docs/` was reformatted in the first
commit (table alignment, quote style in code samples). Content is unchanged.

### DEC-12 Temporary `--pass-with-no-tests`

Step 1 has no TypeScript tests yet, so `bun test` runs with `--pass-with-no-tests`. Removed in
step 2.
