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
3. Quit and relaunch: the main window does not open by itself. Open ttime from the tray: the same
   vault is shown.
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
