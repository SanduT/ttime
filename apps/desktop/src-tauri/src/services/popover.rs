//! The menu bar popover: a panel under the tray icon, created on first use and then kept
//! hidden. It hides when it loses focus.

use tauri::{AppHandle, LogicalPosition, Manager, Rect, WebviewWindow};

use crate::{
    AppError,
    services::{
        panels::{self, Area, WindowKind},
        screens,
    },
};

/// Gap between the menu bar and the popover, in points.
const GAP: f64 = 6.0;

/// Top-left corner for a popover of `size` under `icon`, kept inside `screen`.
#[must_use]
pub fn origin(icon: Area, size: (f64, f64), screen: Area) -> (f64, f64) {
    let (width, _) = size;
    let centered = icon.width.mul_add(0.5, icon.x) - width / 2.0;
    let max_x = (screen.x + screen.width - width).max(screen.x);
    (centered.clamp(screen.x, max_x), icon.y + icon.height + GAP)
}

fn ensure(app: &AppHandle) -> Result<WebviewWindow, AppError> {
    if let Some(window) = app.get_webview_window(WindowKind::Popover.label()) {
        return Ok(window);
    }
    let window = panels::create(app, WindowKind::Popover)?;
    #[cfg(target_os = "macos")]
    {
        let handle = app.clone();
        crate::platform::macos::panel::convert(&window, move || {
            if let Err(err) = hide(&handle) {
                log::error!("Could not hide the popover: {err}");
            }
        })?;
    }
    Ok(window)
}

fn place(app: &AppHandle, window: &WebviewWindow, icon: Rect) -> Result<(), AppError> {
    // The click just happened on the icon, so the cursor is on the icon's screen. The icon's
    // rect comes scaled by that screen's scale.
    let Some(screen) = screens::under_cursor(app)? else {
        return Ok(());
    };
    let icon_position = icon.position.to_logical::<f64>(screen.scale);
    let icon_size = icon.size.to_logical::<f64>(screen.scale);
    let size = window
        .outer_size()?
        .to_logical::<f64>(window.scale_factor()?);
    let (x, y) = origin(
        Area {
            x: icon_position.x,
            y: icon_position.y,
            width: icon_size.width,
            height: icon_size.height,
        },
        (size.width, size.height),
        screen.frame,
    );
    window.set_position(LogicalPosition::new(x, y))?;
    Ok(())
}

/// Shows the popover under the tray icon, or hides it if it is visible.
pub fn toggle(app: &AppHandle, icon: Rect) -> Result<(), AppError> {
    let window = ensure(app)?;
    if window.is_visible()? {
        return hide(app);
    }
    place(app, &window, icon)?;
    panels::show_panel(app, WindowKind::Popover)
}

/// Hides the popover.
pub fn hide(app: &AppHandle) -> Result<(), AppError> {
    panels::hide_panel(app, WindowKind::Popover)
}

#[cfg(test)]
mod tests {
    use super::*;

    const SCREEN: Area = Area {
        x: 0.0,
        y: 0.0,
        width: 1440.0,
        height: 900.0,
    };

    #[test]
    fn centers_under_the_icon() {
        let icon = Area {
            x: 1000.0,
            y: 0.0,
            width: 40.0,
            height: 24.0,
        };
        assert_eq!(origin(icon, (340.0, 460.0), SCREEN), (850.0, 30.0));
    }

    #[test]
    fn stays_on_screen_near_the_right_edge() {
        let icon = Area {
            x: 1400.0,
            y: 0.0,
            width: 40.0,
            height: 24.0,
        };
        assert_eq!(origin(icon, (340.0, 460.0), SCREEN), (1100.0, 30.0));
    }
}
