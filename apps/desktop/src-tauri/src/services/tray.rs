//! Menu bar item. Step 1 shows a static title; the elapsed-time ticker comes with the menu bar step.

use tauri::{
    AppHandle, include_image,
    menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
};

use crate::{
    AppError,
    services::panels::{self, WindowKind},
};

const TRAY_ID: &str = "ttime";
const TITLE: &str = "ttime";
const SHOW_QUICKBAR: &str = "show-quickbar";
const SHOW_POPOVER: &str = "show-popover";
const SHOW_MAIN: &str = "show-main";
const QUIT: &str = "quit";

/// Creates the tray icon with its title and menu.
pub fn create(app: &AppHandle) -> Result<(), AppError> {
    let menu = Menu::with_items(
        app,
        &[
            &MenuItem::with_id(app, SHOW_QUICKBAR, "Quick Bar", true, None::<&str>)?,
            &MenuItem::with_id(app, SHOW_POPOVER, "Popover", true, None::<&str>)?,
            &MenuItem::with_id(app, SHOW_MAIN, "Open ttime", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, QUIT, "Quit ttime", true, Some("CmdOrCtrl+Q"))?,
        ],
    )?;
    TrayIconBuilder::with_id(TRAY_ID)
        .icon(include_image!("icons/tray.png"))
        .icon_as_template(true)
        .title(TITLE)
        .tooltip(TITLE)
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| on_menu_event(app, &event))
        .build(app)?;
    Ok(())
}

fn on_menu_event(app: &AppHandle, event: &MenuEvent) {
    let result = match event.id().as_ref() {
        SHOW_QUICKBAR => panels::show(app, WindowKind::Quickbar),
        SHOW_POPOVER => panels::show(app, WindowKind::Popover),
        SHOW_MAIN => panels::show(app, WindowKind::Main),
        QUIT => {
            app.exit(0);
            Ok(())
        }
        other => {
            log::warn!("Unknown tray menu item: {other}");
            Ok(())
        }
    };
    if let Err(err) = result {
        log::error!("Tray menu action failed: {err}");
    }
}
