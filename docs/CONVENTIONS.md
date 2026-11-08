# ttime: Engineering conventions

Status: v0.1 (2026-11-08)
Applies to every change, whether written by a person or an agent. Read together with `docs/ARCHITECTURE.md`.

## 1. Principles

- **Data safety first.** No change may risk losing or silently corrupting time data.
- **Types are the contract.** Anything from outside (files, IPC, CLI arguments, MCP input, environment) is `unknown` until a schema parses it: Zod in TypeScript, serde in Rust.
- **One way to do each thing.** One layering scheme, one error path, one logger, one check command.
- **Small modules with one job.** Calculations are pure functions; I/O sits at the edges.
- **Every behaviour change has a test.** Every bug fix starts with a failing test.
- **Tools enforce the rules.** This document explains them; ESLint, `tsc`, Clippy and the hooks make them stick.

The rules draw on widely used references: the typescript-eslint `strict-type-checked` and `stylistic-type-checked` configs, the feature-based structure of the bulletproof-react project, the Rust API Guidelines, and Clippy's pedantic lints.

## 2. Tooling at a glance

| Concern                      | TypeScript (core, CLI, desktop UI)                                                                                       | Rust (desktop shell)                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Formatting                   | Prettier, with `prettier-plugin-tailwindcss`                                                                             | rustfmt                                                               |
| Linting                      | ESLint flat config: typescript-eslint strict and stylistic type-checked, React, accessibility, import and boundary rules | Clippy: `all` denied, `pedantic` warned, plus restriction lints       |
| Type checking                | `tsc -b` with the strict base config                                                                                     | the compiler                                                          |
| Unused code and dependencies | knip                                                                                                                     | cargo-machete                                                         |
| Supply chain                 | committed `bun.lock`                                                                                                     | cargo-deny (advisories, licenses, duplicates), committed `Cargo.lock` |
| Tests                        | `bun test`; Playwright for the UI in browser dev mode                                                                    | `cargo test`                                                          |
| Git hooks                    | lefthook (shared by both)                                                                                                |                                                                       |

## 3. One command: `bun run check`

`bun run check` runs, in order, and fails on the first problem:

1. `prettier --check .`
2. `cargo fmt --all --check`
3. `eslint . --max-warnings 0`
4. `tsc -b`
5. `cargo clippy --all-targets --all-features -- -D warnings`
6. `knip`
7. `cargo deny check` and `cargo machete`
8. `bun test` (with the core coverage thresholds)
9. `cargo test`

`bun run fix` applies the automatic fixes (Prettier, `eslint --fix`, `cargo fmt`).

Git hooks (lefthook):

- `pre-commit`: Prettier and ESLint on staged files, `cargo fmt --check`.
- `commit-msg`: Conventional Commits format.
- `pre-push`: `bun run check`.

Agents run `bun run check` before every commit, never commit with failures, and never use `--no-verify`.

## 4. TypeScript

### 4.1 Compiler settings

`tsconfig.base.json`, extended by every package:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2023"],
    "types": [],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "useUnknownInCatchVariables": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```

- `packages/core` keeps `"lib": ["ES2023"]` and `"types": []`, so using `window`, `document`, `process`, `fetch` or Node APIs in core is a compile error.
- `packages/cli` adds Bun types. `apps/desktop` adds `"DOM"`, `"DOM.Iterable"` and `"jsx": "react-jsx"`.
- Project references connect the packages so `tsc -b` checks everything incrementally.

### 4.2 ESLint

One `eslint.config.ts` at the repo root with `parserOptions.projectService: true`.

Base for all TypeScript:

- `@eslint/js` recommended
- `typescript-eslint` `strictTypeChecked` and `stylisticTypeChecked`
- `@eslint-community/eslint-plugin-eslint-comments`: `require-description`, `no-unlimited-disable`, `no-unused-disable`
- `eslint-plugin-import-x`: `no-default-export` (config files excepted), `no-cycle`, `no-duplicates`, `no-extraneous-dependencies`
- `eslint-plugin-simple-import-sort`
- `eslint-plugin-unicorn`, selected rules only: `filename-case` (kebab-case), `prefer-node-protocol`, `throw-new-error`, `no-useless-undefined`
- `eslint-plugin-boundaries` for the layer rules in section 6

Rules that matter most (all errors):

| Rule                                                                                                                | Setting                                                                                       | Purpose                                     |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `@typescript-eslint/no-explicit-any`                                                                                | on                                                                                            | No `any`                                    |
| `@typescript-eslint/consistent-type-assertions`                                                                     | `{ "assertionStyle": "never" }`                                                               | No `as` casts. `as const` is still allowed  |
| `@typescript-eslint/no-non-null-assertion`                                                                          | on                                                                                            | No `!`                                      |
| `@typescript-eslint/no-unsafe-assignment`, `-call`, `-member-access`, `-return`, `-argument`                        | on                                                                                            | `any` from libraries can't leak in          |
| `@typescript-eslint/ban-ts-comment`                                                                                 | `@ts-expect-error` only with a description; `@ts-ignore` and `@ts-nocheck` banned             | No silenced type errors                     |
| `@typescript-eslint/switch-exhaustiveness-check`                                                                    | on                                                                                            | Every case of a union is handled            |
| `@typescript-eslint/strict-boolean-expressions`                                                                     | on                                                                                            | No truthiness bugs with `0`, `""` or `null` |
| `@typescript-eslint/no-floating-promises`, `no-misused-promises`, `await-thenable`, `return-await` (`in-try-catch`) | on                                                                                            | Async safety                                |
| `@typescript-eslint/consistent-type-imports`                                                                        | on                                                                                            | Clean type-only imports                     |
| `@typescript-eslint/consistent-type-definitions`                                                                    | `type`                                                                                        | One way to declare object types             |
| `@typescript-eslint/explicit-module-boundary-types`                                                                 | on in core and CLI                                                                            | Public functions have explicit types        |
| `@typescript-eslint/prefer-readonly`                                                                                | on                                                                                            | Immutable by default                        |
| `@typescript-eslint/naming-convention`                                                                              | camelCase values and functions, PascalCase types and components, UPPER_CASE constants allowed | Consistent names                            |
| `no-restricted-syntax`                                                                                              | bans `enum`, `namespace`, `for...in`                                                          | Use string unions or `as const` objects     |
| `no-restricted-properties`                                                                                          | bans `JSON.parse` (use core's `parseJson`, which returns `unknown`) and `Math.random` in core | Parsing and IDs go through helpers          |
| `no-console`                                                                                                        | on (allowed only in logger implementations and the CLI output module)                         | Central logging                             |
| `no-empty`, `eqeqeq`, `no-param-reassign` (including props), `prefer-const`                                         | on                                                                                            | Basic hygiene                               |
| `max-lines` 300, `max-lines-per-function` 80, `complexity` 12                                                       | warnings (fail through `--max-warnings 0`)                                                    | Keep modules small                          |

Per-package restrictions:

- **core:** `no-restricted-imports` bans `node:*`, `bun`, `bun:*`, `@tauri-apps/*`, `react` and `react-dom`. `no-restricted-globals` bans `Date`, `console`, `process`, `window` and `document`.
- **cli:** bans `@tauri-apps/*` and React. Only `src/runtime/output.ts` and the logger may write to stdout or stderr.
- **desktop:** `@tauri-apps/api` and `@tauri-apps/plugin-*` may be imported only in `src/shared/bridge/**` and `src/shared/adapters/**`. Node built-ins are banned.

React (desktop only):

- `eslint-plugin-react-hooks` recommended, with `rules-of-hooks` and `exhaustive-deps` as errors
- `@eslint-react/eslint-plugin` recommended type-checked config
- `eslint-plugin-jsx-a11y` recommended
- `eslint-plugin-react-refresh` `only-export-components`

Generated files (`src/shared/bridge/bindings.ts`) are excluded from linting and formatting and never edited by hand.

### 4.3 Prettier

`.prettierrc.json`: `{ "printWidth": 100, "singleQuote": true, "trailingComma": "all", "plugins": ["prettier-plugin-tailwindcss"] }`. Prettier also formats JSON, Markdown and YAML. Formatting is never a review topic.

### 4.4 Code style

- **Files:** kebab-case (`timer-service.ts`, `entry-editor.tsx`). One main export per file. Named exports only. `index.ts` exists only as the public API of a package or a feature, never as a barrel inside a layer.
- **Types:** `type` aliases; string literal unions instead of `enum`; `readonly` properties and `ReadonlyArray` for data that is passed around; never mutate arguments.
- **Unknown data:** parse at the boundary, then trust the types. `const raw: unknown = parseJson(text); const file = dayFileSchema.parse(raw);`. No casts to make types fit.
- **Null and undefined:** follow the vault schema (`null` where the file says `null`); optional parameters and fields in code use `?`.
- **Time:** only Temporal through core's time helpers. `Date` is banned in core; in the UI it appears only inside the one helper that converts for libraries that need it. Durations are integer seconds.
- **Money:** only core's money helpers (`big.js`); never arithmetic on amounts as `number`.
- **Services:** factory functions with explicit dependencies, for example `createTimerService({ vault, clock, ids, logger })`, returning an object of functions. No hidden singletons; the per-window store and logger are created once at startup and passed down.
- **Calculations** (rounding, day splitting, report aggregation, parsing) are pure functions with no I/O.
- **Constants:** no magic numbers; each package has a `constants.ts`.
- **Comments** explain why, not what. Every exported function and type in core has a TSDoc comment.
- **No `TODO`** without a matching entry in `docs/DECISIONS.md`. No commented-out code.

## 5. React (`apps/desktop`)

Feature-based structure, in the style of bulletproof-react.

```
src/
  windows/<window>/            root of one window: layout and composition only
  features/<feature>/
    components/                React components for this feature
    hooks/                     data and action hooks
    lib/                       view helpers (formatting, mapping core data to view models)
    index.ts                   the feature's public API
  shared/
    ui/                        design-system primitives (Button, Kbd, ListItem, Chip, Surface, Dialog)
    bridge/                    generated IPC bindings and thin wrappers
    adapters/                  TauriFs, logger
    store/                     Zustand store on @ttime/core
    lib/                       runAction, cn(), formatting
    styles/tokens.css          design tokens as CSS variables
```

Components:

- Function components only, named exports, props declared as `type Props = { ... }`. No `React.FC`.
- Three kinds, each with one job:
  1. **Primitives** in `shared/ui`: no app knowledge; wrap Radix where useful; styled with Tailwind, variants with `cva`, classes merged with `cn()` (clsx plus tailwind-merge).
  2. **Feature components:** compose primitives; get data and actions only through the feature's hooks.
  3. **Window roots:** compose features; no logic.
- Components never call `invoke`, never touch files, and contain no business rules (no duration math in JSX; use core helpers).
- Data flows through hooks (`useRunningEntry()`, `useStartTimer()`) that select from the store and call core services.
- `useEffect` only to subscribe to external systems (events, timers). Never for derived state; derive with selectors or `useMemo`.
- Every user action runs through `runAction(label, fn)`, which handles errors centrally (section 7).
- Split a component that passes about 150 lines or takes more than about 7 props.

Accessibility and styling:

- Everything is usable from the keyboard, with labels and a visible focus ring. Respect `prefers-reduced-motion`.
- Colors, spacing and radii come from `tokens.css`. No raw hex values in components; project colors are passed as CSS variables. No inline `style` other than setting CSS variables.
- Keyboard shortcuts are declared in one registry per window; the footer hints and the ⌘K panel are generated from it.

## 6. Layers and boundaries

Arrows point to what a layer may import. Enforced with `eslint-plugin-boundaries` and `import-x/no-cycle`.

### 6.1 `packages/core`

```
schema, model  <-  ports  <-  storage  <-  domain  <-  index.ts (public API)
```

- **schema, model:** Zod schemas and inferred types; tiny pure helpers only.
- **ports:** interfaces (`FsPort`, `ClockPort`, `EnvPort`, `Logger`) and `MemoryFs`.
- **storage (repositories):** the only code that knows file paths and the JSON layout. Exposes functions such as `readDay`, `writeDay`, `readRunning`. Domain code never builds paths.
- **domain (services):** business rules on top of repositories and ports.
- Other packages import only `@ttime/core`, never deep paths.

### 6.2 `packages/cli` (routes, controllers and services, CLI style)

```
src/
  index.ts         entry: parse argv, choose CLI or MCP mode
  runtime/         context (vault, clock, logger), error handler, exit codes, output writer
  commands/        one file per command: parse arguments with Zod, call core, return a result object
  presenters/      turn result objects into human text or JSON; no logic
  mcp/
    server.ts      SDK setup and stdio transport
    tools/         one file per tool: input schema plus a thin handler that calls core
  adapters/        node-fs.ts
```

Commands and tools never print; they return data. Presenters never call core. All errors flow to `runtime/handle-error.ts`.

### 6.3 `apps/desktop`

```
windows  ->  features  ->  shared  ->  @ttime/core
```

- Features import other features only through their `index.ts`, without cycles.
- `shared` never imports features or windows.
- Only `shared/bridge` and `shared/adapters` import `@tauri-apps/*`.

## 7. Errors (TypeScript)

- Core throws only `TTimeError` (`code`, `message`, optional `details` and `cause`). Codes are a string-literal union in `errors.ts`, namespaced: `vault.parse_failed`, `vault.locked`, `timer.already_running`, `entry.overlap`, `input.invalid`, and `io.*` / `platform.*` for errors coming from Rust.
- Never throw strings or plain `Error` in core. Never swallow errors.
- Expected outcomes are values, not exceptions: a missing file returns `null`; file problems become `VaultIssue` objects.
- Errors are caught only at boundaries, each in exactly one place:
  - **CLI:** `runtime/handle-error.ts` maps codes to messages and exit codes (1 user error, 2 vault problem, 70 internal error).
  - **MCP:** one wrapper around every tool handler returns an error result with the code and message.
  - **UI:** `runAction()` shows a toast with the user-facing message; one error boundary per window catches render errors and offers a reload.
- Anything that is not a `TTimeError` is logged with its stack and shown as "Something went wrong", pointing to the log file.

## 8. Logging

- One `Logger` port in core: `debug`, `info`, `warn`, `error`, each taking a message and a structured context object.
- **Desktop:** the logger forwards to `tauri-plugin-log`, so Rust and every webview write to one rotating log file in the app's log directory (and to the terminal in development).
- **CLI:** JSON lines to stderr, level from `TTIME_LOG` (default `warn`). In MCP mode stdout belongs to the protocol; nothing else is ever written there.
- **Levels:** `error` when an operation failed; `warn` for a recovered problem (stale lock removed, invalid file skipped); `info` for lifecycle events (app start, vault opened, migration); `debug` for detail.
- **Privacy:** entry descriptions, notes and client names appear only at `debug`. Logs never leave the machine.

## 9. Testing (TypeScript)

- **Unit tests** live next to the code (`timer-service.test.ts` beside `timer-service.ts`). They are pure and fast: `MemoryFs`, a fixed clock, no real files, no real timers.
- **Integration tests** live in `packages/<name>/test/integration/*.int.test.ts`: real temp folders through `NodeFs`, several processes writing at once, the CLI run end to end as a subprocess, the MCP server through an in-process client.
- **UI:** component tests with happy-dom; Playwright end-to-end tests in `apps/desktop/e2e/` against the browser dev mode.
- **Fixtures** in `packages/core/fixtures/`; test data builders (`buildEntry({ ... })`) instead of large literals.
- One behaviour per test, arrange-act-assert, names that describe behaviour ("switching stops the running entry at the same instant").
- **Coverage:** `packages/core/bunfig.toml` sets `coverageThreshold = { lines = 0.9, functions = 0.9 }`. Bun applies it to each file.

## 10. Rust (`apps/desktop/src-tauri`)

### 10.1 Module structure

The Rust equivalent of controllers, services and adapters:

```
src/
  main.rs          calls the library's run()
  lib.rs           wiring only: plugins, state, command and event registration, setup
  error.rs         AppError and its IPC serialization
  state.rs         AppState and its parts
  events.rs        typed events emitted to the webviews
  commands/        IPC handlers ("controllers"): thin, one file per area
                   vault.rs, windows.rs, tray.rs, monitors.rs
  services/        behaviour; no Tauri command attributes
                   vault_io.rs, watcher.rs, tray.rs, panels.rs, activation.rs, scheduler.rs
  platform/        OS integration behind traits
    mod.rs         traits: IdleSource, PowerEvents, PanelHost, TrayTitle
    macos/         idle.rs, power.rs, panel.rs (all unsafe code lives here)
tests/             integration tests
```

- **Commands** validate input, call one service and map the result. No logic and no direct OS calls.
- **Services** are plain Rust that take their dependencies as arguments; testable without a running Tauri app where possible (the scheduler takes a clock trait).
- **Platform** code implements one trait per capability under `#[cfg(target_os = "macos")]`. Other systems get implementations returning `AppError::Unsupported` until Phase 3.
- **Typed IPC:** commands and events are registered with `tauri-specta`, which generates `apps/desktop/src/shared/bridge/bindings.ts`. The frontend never writes `invoke` strings or casts results. tauri-specta v2 is still a release candidate, so pin exact versions with `=`. If it causes trouble, fall back to a hand-written bridge in which every result is parsed with Zod.

### 10.2 Errors

- One `AppError` enum in `error.rs`, built with `thiserror` (for example `Io`, `PathNotAllowed`, `Watcher`, `Platform`, `Unsupported`, `InvalidInput`). It serializes as `{ code, message }` with codes matching the TypeScript `io.*` and `platform.*` codes.
- Every command returns `Result<T, AppError>`. The bridge turns these into `TTimeError` in one mapping function.
- No `unwrap`, `expect`, `panic!`, `todo!` or `unimplemented!` outside tests; Clippy denies them. Use `?` with meaningful variants.
- No `anyhow` in the app crate (it's fine in build scripts and tests).

### 10.3 Logging

`log` macros (`log::info!` and friends) through `tauri-plugin-log`, into the same file as the webviews. No `println!` or `eprintln!` (Clippy denies them). Same levels and privacy rules as section 8.

### 10.4 Lints

In `Cargo.toml`:

```toml
[lints.rust]
unsafe_code = "deny"
unused_must_use = "deny"
missing_debug_implementations = "warn"

[lints.clippy]
all = { level = "deny", priority = -1 }
pedantic = { level = "warn", priority = -1 }
unwrap_used = "deny"
expect_used = "deny"
panic = "deny"
todo = "deny"
unimplemented = "deny"
dbg_macro = "deny"
print_stdout = "deny"
print_stderr = "deny"
undocumented_unsafe_blocks = "deny"
allow_attributes_without_reason = "deny"
module_name_repetitions = "allow"
missing_errors_doc = "allow"
```

- `clippy.toml`: `allow-unwrap-in-tests = true`, `allow-expect-in-tests = true`.
- `platform/macos` is the only module allowed to use `unsafe`, with an attribute that states the reason (Objective-C interop). Every `unsafe` block has a `// SAFETY:` comment.
- Any other exception uses `#[expect(lint, reason = "...")]` on the smallest possible item.

### 10.5 Formatting, toolchain and tests

- `rustfmt.toml`: `edition = "2024"`, `max_width = 100`, `use_field_init_shorthand = true`, `use_try_shorthand = true`.
- `rust-toolchain.toml` pins the stable channel with the `rustfmt` and `clippy` components. The crate uses edition 2024.
- `deny.toml` for cargo-deny: security advisories, allowed licenses (MIT, Apache-2.0, BSD, ISC, Unicode, Zlib), duplicate crates.
- Unit tests in a `#[cfg(test)] mod tests` at the bottom of each file; integration tests in `tests/`.

## 11. Dependencies

- Add a dependency only when it removes real complexity, and say why in the commit message. New runtime dependencies in `@ttime/core` also need a `docs/DECISIONS.md` entry.
- Prefer maintained, widely used packages with permissive licenses (MIT, Apache-2.0, ISC, BSD).
- Pin exact versions for pre-1.0 and release-candidate crates. Commit both lockfiles.

## 12. Git workflow and definition of done

- Conventional Commits: `feat(core): ...`, `fix(desktop): ...`, `test(cli): ...`, `refactor`, `docs`, `chore`. Checked by the `commit-msg` hook.
- Small commits; each leaves `bun run check` green.
- A change is done when:
  - `bun run check` passes with zero warnings;
  - tests cover the new behaviour (and a fixed bug has a regression test);
  - docs are updated: PRD or ARCHITECTURE when behaviour or structure changes, `DECISIONS.md` for deviations, `QA.md` for new manual checks;
  - there is no commented-out code and no untracked TODO.
