# Changelog

All notable changes are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.0]

- Fixed: after creating a vault in the welcome tour, the quick bar and menu bar said no vault was
  open until ttime was restarted.

## [0.1.0]

First public version.

- Quick bar on a global hotkey to start, switch, stop and annotate timers, with `@project`,
  `#tag` and time offsets while typing.
- Menu bar timer and popover with Stop, Note, Switch, Resume, recent entries and totals.
- Main window: Today with gap filling, week calendar with drag editing, projects and clients,
  analytics, CSV export with rounding and locale options, and an Issues view for broken files.
- Idle and sleep detection, forgotten-timer alert, end-of-day auto-stop, undo and trash.
- Plain JSON vault (schema 1) with locked, validated, logged writes.
- `ttime` CLI, MCP server and Claude skill, set up from Settings.
- Onboarding tour, three accent themes, light and dark appearance.
