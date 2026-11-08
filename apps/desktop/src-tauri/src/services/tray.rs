//! Menu bar item. The title shows the running project; the elapsed-time ticker comes with the
//! menu bar step.

use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, include_image,
    menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
};

use crate::{
    AppError,
    services::{
        panels::{self, WindowKind},
        quickbar::{self, QuickbarMode},
    },
};

const TRAY_ID: &str = "ttime";
const TITLE: &str = "ttime";
const SHOW_QUICKBAR: &str = "show-quickbar";
const SHOW_POPOVER: &str = "show-popover";
const SHOW_MAIN: &str = "show-main";
const QUIT: &str = "quit";

/// What the menu bar shows while tracking, pushed by the agent webview with `set_running`.
/// Rust never reads vault files for this.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RunningSummary {
    /// Vault timestamp of the start.
    pub start: String,
    pub project_name: String,
    /// `#RRGGBB`.
    pub color: String,
}

/// The tray title for `summary`.
#[must_use]
pub fn title_for(summary: Option<&RunningSummary>) -> String {
    summary.map_or_else(|| TITLE.to_owned(), |running| running.project_name.clone())
}

/// Updates the tray title for the running entry, or the idle title.
pub fn show_running(app: &AppHandle, summary: Option<&RunningSummary>) -> Result<(), AppError> {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        tray.set_title(Some(title_for(summary)))?;
    }
    Ok(())
}

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
        SHOW_QUICKBAR => quickbar::show(app, QuickbarMode::New),
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn title_names_the_running_project() {
        let summary = RunningSummary {
            start: "2026-11-08T09:00:00+02:00".into(),
            project_name: "Acme Website".into(),
            color: "#4F7CFF".into(),
        };
        assert_eq!(title_for(Some(&summary)), "Acme Website");
        assert_eq!(title_for(None), "ttime");
    }
}
