# Manual QA

The native shell (panels, tray, hotkey, monitors) cannot be driven by Tauri's WebDriver on macOS, so
it is checked by hand for each milestone. Run each list after `bun run dev`.

## Step 1: Scaffold

1. No Dock icon appears (Accessory activation policy).
2. A clock icon with the title `ttime` appears in the menu bar.
3. Clicking it opens a menu: Quick Bar, Popover, Open ttime, Quit ttime.
4. Quick Bar and Popover each show their window. Closing them hides them; reopening is instant.
5. Open ttime shows the main window and a Dock icon. Closing it removes the Dock icon.
6. Quit ttime exits the app.
7. The terminal shows `ttime started` and `Window started` lines from Rust and the webviews.

## Step 4: File layer and onboarding

Start with no `~/.config/ttime/config.json` (move it aside if it exists).

1. Launch: the main window opens on "Welcome to ttime".
2. Create vault…: pick an empty folder. The overview shows the vault name, the folder and zero
   counts. `~/.config/ttime/config.json` now names that folder.
3. Quit and open ttime from Finder: the main window opens on the same vault. At login (Open
   ttime at login on) it stays in the menu bar. With ttime running and the window closed, open it
   again from Finder or Spotlight: the main window shows.
4. With the window open, edit the vault from outside (for example add `projects/x.json` with
   invalid JSON). Within a second the overview shows the issue; deleting the file clears it.
5. Open existing vault… on a folder without `ttime.json`: a message says it is not a vault, and
   the previous vault stays open.
6. Create vault… on a folder that already holds a vault: a message says so; nothing is changed.

## Step 5: Quick bar

1. Press ⌥⇧Space over any app: the quick bar appears under the cursor, in the upper part of the
   screen, without the other app losing its menu bar. Press it again to hide it.
2. Empty input: the latest entry is the highlighted row and today's entries are listed below.
3. Type `auth @ac`: projects matching `ac` are listed; Enter completes `@acme-website`. Add
   `-20m` and press Enter: the confirmation shows the entry with a running timer and the tray
   title shows the project. Enter closes the quick bar and focus returns to the previous app.
4. ⌘↵ with text adds a note; the notes list shows it with its time. Add a second note, then Esc.
5. `kickoff @newthing` Enter: the row said "new project", the project is created and the
   previous entry is stopped at the same instant.
6. ⌘E: the description field has focus. Change it and press Enter: "Updated" shows.
7. ⌘E, set the start before the previous entry ended, Enter: the overlap message shows; Enter
   again trims and saves.
8. Type `x @acme -3h` while an entry runs: a readable "Can't switch at ..." message shows.
9. ⌘K lists every action with its shortcut; Esc returns to the input.
10. ⌘. stops: the confirmation shows what was logged; the tray title returns to `ttime`.
11. ⌘O opens the main window.
12. Click another app while the quick bar is open: it hides.
13. With two screens, put the pointer on the secondary one and press the shortcut: the quick bar
    opens there. Click the menu bar icon on the secondary screen: the popover opens under it.

## Step 6: Menu bar

1. Idle: the menu bar shows the clock icon only (no title).
2. Start an entry with the quick bar: the icon becomes a dot in the project color and the title
   shows `0:00`, then `0:01` a minute after the start. A backdated start (`-20m`) shows `0:20`.
3. Left click the icon: the popover opens under it with the running entry, its latest notes, a
   seconds counter, Recent and the Today and This week totals. Click elsewhere: it hides.
4. Expand Today and This week: per-project times show, including the running entry.
5. Popover Stop: the dot turns back into the clock and the title clears. The popover then shows
   `Resume <description>`: it continues the same project and description as a new entry.
6. Popover Add note… and Switch… hide the popover and open the quick bar in that mode.
7. Discard, then Confirm discard: the running entry is gone and nothing is logged.
8. Click a Recent row: it starts that entry (the previous one stops at the same instant).
9. Right click the icon: Stop, New Entry…, Add Note…, Open ttime, Quit ttime. Stop ends the
   entry. When idle, the first item reads `Resume <description>` and resumes it.
10. Edit `running.json` from outside (or use the CLI): the icon and title follow within a second.

## Step 7: Main window

Open ttime from the tray. The vault should have a few entries today and on other days.

1. The sidebar shows the vault name, Today and Projects. Issues appears only while a file is
   broken.
2. Today lists today's entries by start with their notes, the running entry, and dashed "Untracked"
   rows for gaps inside 09:00 to 18:00 on weekdays. The header shows the day total and per project.
3. ← and → change the day, T returns to today (not while typing in a field).
4. Click an entry: it opens in place. Change the end time and the project, press Enter: the row
   updates. Esc cancels an edit.
5. Fill gap: the form starts with the gap's times; pick a project, Enter: the entry is added and
   the gap shrinks or disappears.
6. Add entry with `22:00` to `01:00`: it is three hours and counts on both days.
7. Delete an entry from its editor: a toast says ⌘Z restores it. Press ⌘Z: it is back. Press ⇧⌘Z:
   it is deleted again.
8. Edit an entry, then change the same entry in its day file from outside, then press ⌘Z: the
   message says it was edited again since, and nothing changes.
9. Projects: groups by client with this week, this month and all time. New project with a client,
   a color and a rate of `50`: it appears in its client group.
10. Open the project: entries by day with notes; This week, This month and All time change the
    list and the total; with a rate the amount shows next to the total.
11. Edit the project, clear the rate and the client, Save: it moves to "No client".
12. Archive it: it disappears; "Show archived" shows it with "Archived". Unarchive works.
13. New client, then Edit on its group header: rename it and archive it.
14. Break a project file on disk (invalid JSON on line 3): Issues appears with a count; it shows
    `projects/<name>.json:3` and the message. Fix the file: Issues disappears.

## Step 8: CSV export

1. Projects, Export CSV: Period is This month. The preview line shows the dates, rows, total and
   amounts, and updates when any option changes. No control overflows the sheet.
2. Period Last week and Last month: the dates are the full previous week or calendar month.
   Month… shows a month list (last 24 months). Custom… shows From and To.
3. Open a project, pick This week, Export CSV: Period is This week. With All time it is Custom.
4. Switch Rows to "One per project and day": the row count drops when a day has several entries.
5. Rounding Up, 15 min, Each entry: the total grows. Each day total: it changes only the daily rows.
6. Export CSV: "Saved exports/..." shows. Open opens the file in Numbers or Excel; Reveal in Finder
   selects it. Open exports folder opens the folder in Finder, even before the first export.
7. Open the file in Numbers or Excel: accents and quotes are intact, `duration_decimal` and `amount`
   are numbers. With Semicolon and Comma decimals, Excel in a comma-decimal locale reads it too.
8. An entry across midnight is two rows, one per day.

## Step 8b: Settings

1. ⌘, in the main window, the sidebar's Settings, and the tray's Settings… each open Settings.
2. Quick bar shortcut: click, press ⌃⌥K. The button shows ⌃⌥K; ⌃⌥K now toggles the quick bar and
   ⌥⇧Space does nothing. Press a shortcut another app owns (for example ⌘Space): an error shows and
   the previous one still works. Esc while recording cancels.
3. Menu bar while tracking: Project and time shows `Acme Website 0:12`; Icon only shows the dot
   alone; Show seconds makes the time tick every second.
4. Appearance Dark and Light switch every window (main, quick bar, popover); System follows macOS.
5. Open ttime at login: on, then check System Settings, General, Login Items. Off removes it.
6. Quit and relaunch: the shortcut, menu bar display and appearance are kept.
7. Week starts on Sunday: the popover's This week and the export presets start on Sunday.
8. Working hours: turn off Fri, set 10:00 to 16:00. Today's untracked gaps follow. 16:00 to 10:00
   shows an error and nothing changes.
9. Change Day starts at to `04:00`; ⌘Z restores `00:00`.
10. Export defaults: set Semicolon. A new export sheet starts with Semicolon.
11. Reveal in Finder selects the vault folder. Open another vault… switches the main window, and
    the quick bar and popover show the new vault's projects.

## Step 9: Calendar

Have a few entries this week, including one across midnight and two that overlap.

1. Sidebar Calendar: this week from the configured week start, day names with dates and totals,
   the week total, a shaded working-hours band, and a red line at the current time today.
2. The grid opens scrolled to an hour before the working day. Hours are labelled on the left.
3. The midnight entry shows as two blocks. Overlapping entries sit side by side with a red ring
   and ⚠.
4. Drag on empty space from 14:00 to 15:30: a dashed preview follows in 5 minute steps. Release:
   the dialog shows 14:00 to 15:30. Pick a project, Add: the block appears.
5. Drag a block down by 30 minutes and onto the next day: it moves, keeping its length.
6. Drag a block's bottom edge: it resizes. Hold ⌥ while dragging: 1 minute steps.
7. ⌥-drag a block: a copy appears, the original stays.
8. Click a block: the editor opens. Change the project, Save: the color changes. Delete: gone,
   ⌘Z brings it back. ⌘Z after a move puts the block back.
9. ← and → change the week, This week and T return. The running entry grows and cannot be dragged.
10. Change Week starts on in Settings: the calendar follows.

## Step 10: Analytics

1. Sidebar Analytics: This week by default. Hours, Billable and Amount tiles; Hours per project
   bars (largest first); Hours per day columns stacked in the project colors; the Projects table
   with hours, share and amount.
2. The ← and → buttons and keys move a week, T returns to this week; Last month shows the whole previous month; This year labels months under
   the day chart. Custom… shows From and To; a valid date updates the view.
3. Set rounding Up, 15 min in Settings: a note appears and totals grow. Export CSV with Rows "One
   per project and day" for the same period: its preview total equals the Hours tile.
4. Click a project name: its days, entries and notes. ← All projects returns. Export CSV from
   there exports only that project.
5. A period with no time says so.

## Step 11: Monitors

Settings, App: set Idle detection to 1 minute and Long timers to 0 for the first checks.

1. Start a timer, leave the Mac untouched for 2 minutes, then move the mouse: within 30 seconds the
   quick bar shows "You were away" with the times. Keep all has focus; Esc keeps everything.
2. Repeat and choose Discard idle time: Today shows the entry ending at the last input and a new
   one with the same project and description from the return. ⌘Z in the main window undoes it.
3. Discard idle time and stop: nothing runs afterwards. Assign idle time with another project: the
   away stretch becomes an entry for that project and the timer continues.
4. Lock the screen (⌃⌘Q) for 2 minutes, unlock: the same prompt shows. Close the lid for 2 minutes,
   open it: the prompt shows with the time the lid closed.
5. A break shorter than the threshold asks nothing. Idle detection 0: never asks.
6. Long timers 1, start a timer backdated `-61m`: within 30 seconds "Still working?" shows. Stop at
   the last activity ends the entry at that time; Stop now ends it now.
7. Auto-stop: enable it with a time a minute from now, start a timer, leave the Mac for 6 minutes:
   the timer has stopped at your last input, and the menu bar shows the idle icon.
8. Invalid values (`24:00`, `abc`) are not saved. Settings survive a restart.

## Step 12: CLI, MCP server and skill

`T` is `bun packages/cli/src/index.ts` from the repo root (or `ttime` after `bun run build:cli`).

1. `T status`, `T ls --period this-week`, `T report --period last-week --group day`: match the app.
2. `T start "test @<project> -15m"`: the menu bar shows it within a second. `T note "hello"`,
   `T stop`: the entry and note appear in Today.
3. `T projects add --name "CLI Test" --rate 40 --dry-run` writes nothing; without `--dry-run` it is
   created; `T undo` removes it.
4. `T add --project <p> --date yesterday --duration 1h --desc x`: it appears in the calendar.
5. `T export --period last-month`: the printed file opens in Numbers.
6. `T doctor` on a vault with a broken file prints the file and line and exits 2.
7. Register the MCP server in Claude Code: `claude mcp add ttime -- bun <repo>/packages/cli/src/index.ts mcp`
   (or the built binary with `mcp`). In Claude, "add 2 hours yesterday afternoon on <project> for
   the auth review": Claude calls `list_projects` and `add_entry`; the calendar shows the entry
   within a second (PRD S9). "Undo that" reverts it.
8. Ask Claude to move 4 or more entries: it shows a preview and asks before writing.
9. Copy or link `skills/ttime` into `~/.claude/skills/`: Claude follows its conventions (confirms
   inferred times, mentions undo).

## UI refresh

1. Settings > Theme: Ember, Jade and Iris each restyle the main window, popover and quick bar at
   once (buttons, selection, focus rings). The choice survives a restart.
2. Popover: it scales in under the icon each time it opens. The running card has a soft glow in the
   project color, a breathing dot and a timer whose digits roll. Today and This week show project
   bars; clicking one lists the projects.
3. Quick bar: it scales in on each show. The verb chip and caret use the accent; the selected row is
   tinted; the footer shows keycaps.
4. Main window: views cross-fade; the sidebar has icons and the running entry above Settings
   (click edits it in the quick bar); Today shows the relative day, stat cards, a split bar that grows
   in and rows that appear one after another. Moving a calendar block slides it into place.
5. Settings > Vault > Welcome tour > Show again: the four screens slide; pressing the shortcut on
   step 2 shows "It works"; Done returns to the main window. With no vault, the tour starts on
   launch and Continue stays disabled on the vault step until one is created or opened.
6. System Settings > Accessibility > Display > Reduce motion: animations stop, everything still works.
7. The Dock and Finder show the new icon after `bun run build:app`.
