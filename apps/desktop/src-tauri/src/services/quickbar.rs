//! The quick bar: toggled by the global shortcut, shown in the upper part of the screen under
//! the cursor, hidden on Esc (from the webview) or when it loses focus.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, LogicalPosition, Manager, WebviewWindow};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_specta::Event;

use crate::{
    AppError,
    events::QuickbarShown,
    services::panels::{self, Area, WindowKind},
};

/// Default global shortcut (PRD 6.1). Configurable in Settings later.
pub const DEFAULT_SHORTCUT: &str = "Alt+Shift+Space";

/// Fraction of the screen height above the panel's top edge.
const TOP_FRACTION: f64 = 0.2;

/// What the quick bar opens for.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "kebab-case")]
pub enum QuickbarMode {
    New,
    Note,
    EditRunning,
}

/// Top-left corner for a panel of `size` on `area`: centered horizontally, its top a fifth of
/// the way down, and never past the area's edges.
#[must_use]
pub fn origin(area: Area, size: (f64, f64)) -> (f64, f64) {
    let (width, height) = size;
    let x = area.x + ((area.width - width) / 2.0).max(0.0);
    let top = area.height.mul_add(TOP_FRACTION, area.y);
    let y = top.min(area.y + (area.height - height).max(0.0));
    (x, y)
}

fn window(app: &AppHandle) -> Result<WebviewWindow, AppError> {
    app.get_webview_window(WindowKind::Quickbar.label())
        .ok_or_else(|| AppError::Panel("the quick bar window is missing".into()))
}

/// Creates the hidden quick bar and, on macOS, turns it into a panel.
pub fn create(app: &AppHandle) -> Result<(), AppError> {
    let window = panels::create(app, WindowKind::Quickbar)?;
    #[cfg(target_os = "macos")]
    {
        let handle = app.clone();
        crate::platform::macos::panel::convert(&window, move || {
            if let Err(err) = hide(&handle) {
                log::error!("Could not hide the quick bar: {err}");
            }
        })?;
    }
    #[cfg(not(target_os = "macos"))]
    let _ = window;
    Ok(())
}

/// Registers the default global shortcut that toggles the quick bar.
pub fn register_shortcut(app: &AppHandle) -> Result<(), AppError> {
    app.global_shortcut()
        .on_shortcut(DEFAULT_SHORTCUT, |app, _shortcut, event| {
            if event.state == ShortcutState::Pressed
                && let Err(err) = toggle(app)
            {
                log::error!("Could not toggle the quick bar: {err}");
            }
        })
        .map_err(|err| AppError::Panel(format!("could not register {DEFAULT_SHORTCUT}: {err}")))
}

fn place(app: &AppHandle, window: &WebviewWindow) -> Result<(), AppError> {
    let cursor = app.cursor_position()?;
    let Some(monitor) = app
        .monitor_from_point(cursor.x, cursor.y)?
        .or(app.primary_monitor()?)
    else {
        return Ok(());
    };
    let scale = monitor.scale_factor();
    let position = monitor.work_area().position.to_logical::<f64>(scale);
    let size = monitor.work_area().size.to_logical::<f64>(scale);
    let panel = window
        .outer_size()?
        .to_logical::<f64>(window.scale_factor()?);
    let area = Area {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
    };
    let (x, y) = origin(area, (panel.width, panel.height));
    window.set_position(LogicalPosition::new(x, y))?;
    Ok(())
}

/// Shows the quick bar under the cursor in `mode` and focuses it.
pub fn show(app: &AppHandle, mode: QuickbarMode) -> Result<(), AppError> {
    let window = window(app)?;
    place(app, &window)?;
    QuickbarShown { mode }.emit_to(app, WindowKind::Quickbar.label())?;
    panels::show_panel(app, WindowKind::Quickbar)
}

/// Hides the quick bar. On macOS the previous app keeps (and regains) keyboard focus.
pub fn hide(app: &AppHandle) -> Result<(), AppError> {
    panels::hide_panel(app, WindowKind::Quickbar)
}

/// Hides the quick bar if it is visible, otherwise shows it in `new` mode.
pub fn toggle(app: &AppHandle) -> Result<(), AppError> {
    if window(app)?.is_visible()? {
        hide(app)
    } else {
        show(app, QuickbarMode::New)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SCREEN: Area = Area {
        x: 0.0,
        y: 25.0,
        width: 1440.0,
        height: 875.0,
    };

    #[test]
    fn centers_the_panel_in_the_upper_part_of_the_screen() {
        assert_eq!(origin(SCREEN, (680.0, 420.0)), (380.0, 200.0));
    }

    #[test]
    fn follows_a_second_screen() {
        let right = Area {
            x: 1440.0,
            ..SCREEN
        };
        assert_eq!(origin(right, (680.0, 420.0)), (1820.0, 200.0));
    }

    #[test]
    fn stays_on_a_screen_smaller_than_the_panel() {
        let tiny = Area {
            x: 0.0,
            y: 0.0,
            width: 600.0,
            height: 400.0,
        };
        assert_eq!(origin(tiny, (680.0, 420.0)), (0.0, 0.0));
    }

    #[test]
    fn modes_serialize_in_kebab_case() {
        let json = serde_json::to_string(&QuickbarMode::EditRunning).unwrap_or_default();
        assert_eq!(json, "\"edit-running\"");
    }
}
