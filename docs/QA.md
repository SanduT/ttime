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
