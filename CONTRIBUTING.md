# Contributing

Issues and pull requests are welcome. For anything larger than a fix, open an issue first so we
can agree on the approach.

## Setup

You need macOS 26, [Bun](https://bun.sh), Rust (the version in
`apps/desktop/src-tauri/rust-toolchain.toml` installs itself through rustup) and the Xcode command
line tools.

```sh
bun install          # dependencies and the git hooks
bun run dev          # the app in development mode
bun run check        # everything CI runs; must pass before every commit
bun run fix          # formatting and auto-fixable lint
bun run build:app    # ttime.app with the CLI inside, in apps/desktop/src-tauri/target/release/bundle
```

`bun run build:app` signs the app ad hoc, which is enough to run it on your own Mac. To sign with
your own Developer ID, put `{ "bundle": { "macOS": { "signingIdentity": "..." } } }` in
`apps/desktop/src-tauri/tauri.local.conf.json` (ignored by git) and add
`--config src-tauri/tauri.local.conf.json` to the build.

## How the code is organized

- `packages/core`: the vault format, rules and every operation, in pure TypeScript.
- `packages/cli`: the `ttime` CLI and MCP server.
- `apps/desktop`: the Tauri app (React webviews and a thin Rust shell).

Read [docs/CONVENTIONS.md](docs/CONVENTIONS.md) before writing code. In short: strict TypeScript
with no `any` or casts, core tests first and next to the code, no lint rule disabled to pass, and
vault rules from [docs/FORMAT.md](docs/FORMAT.md) never broken. Exceptions are recorded in
[docs/DECISIONS.md](docs/DECISIONS.md).

## Commits and pull requests

- Conventional Commits with a scope, for example `fix(core): keep unknown keys on rewrite`. A git
  hook checks the format.
- Keep a pull request to one change, with tests, and note user-facing changes in
  [CHANGELOG.md](CHANGELOG.md) under Unreleased.
- The app must never make network calls, and UI text uses no em dashes.

## Releases

Maintainers tag `vX.Y.Z`; GitHub Actions builds, signs, notarizes and drafts the release
(`.github/workflows/release.yml`).
