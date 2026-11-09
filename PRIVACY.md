# Privacy

ttime makes no network calls. It has no account, no analytics, no crash reporting and no update
check.

What it stores, all on your Mac:

- **Your vault:** the folder you picked, with your clients, projects, entries and a changelog of
  every change. You decide whether it is synced (git, iCloud Drive, Syncthing) or not.
- **`~/.config/ttime`:** which vault to open, app preferences and short-lived lock folders.
- **Logs:** `~/Library/Logs/io.github.sandut.ttime`. Descriptions, notes and client names are only
  written at debug level, which is off by default.

When you connect an AI client through the MCP server, that client reads and changes your vault on
your request, and what it sends to its own servers is governed by that client's privacy policy.
