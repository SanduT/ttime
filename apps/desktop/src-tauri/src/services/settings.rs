//! Applying app preferences: the quick bar shortcut, the window theme and the menu bar title.

use tauri::{AppHandle, Manager, Theme};

use crate::AppError;
use crate::services::menubar::TitleStyle;
use crate::services::prefs::{self, Appearance, Prefs};
use crate::services::{monitor, quickbar};
use crate::state::AppState;

/// The title style the menu bar ticker uses.
#[must_use]
pub const fn title_style(prefs: &Prefs) -> TitleStyle {
    TitleStyle {
        display: prefs.menu_bar_display,
        seconds: prefs.show_seconds,
    }
}

/// Sets every window to `appearance`; `System` follows macOS.
pub fn apply_theme(app: &AppHandle, appearance: Appearance) {
    let theme = match appearance {
        Appearance::System => None,
        Appearance::Light => Some(Theme::Light),
        Appearance::Dark => Some(Theme::Dark),
    };
    app.set_theme(theme);
}

/// Applies the saved preferences at launch. A taken shortcut is logged; the tray menu still
/// opens the quick bar.
pub fn apply_saved(app: &AppHandle, prefs: &Prefs) {
    if let Err(err) = quickbar::register_shortcut(app, &prefs.quickbar_shortcut) {
        log::error!("{err}");
    }
    apply_theme(app, prefs.appearance);
}

/// Moves the quick bar shortcut from `old` to `new`; on failure `old` stays registered.
fn change_shortcut(app: &AppHandle, old: &str, new: &str) -> Result<(), AppError> {
    if old == new {
        return Ok(());
    }
    quickbar::unregister_shortcut(app, old);
    quickbar::register_shortcut(app, new).inspect_err(|_| {
        if let Err(err) = quickbar::register_shortcut(app, old) {
            log::error!("{err}");
        }
    })
}

/// Validates, applies and saves `next`. Returns what is now in effect.
pub fn update(app: &AppHandle, next: &Prefs) -> Result<Prefs, AppError> {
    let state = app.state::<AppState>();
    let mut current = state.prefs()?;
    let shortcut = next.quickbar_shortcut.trim();
    if shortcut.is_empty() {
        return Err(AppError::InvalidInput(
            "Record a shortcut for the quick bar.".into(),
        ));
    }
    monitor::config_of(next)?;
    change_shortcut(app, &current.quickbar_shortcut, shortcut)?;
    let next = Prefs {
        quickbar_shortcut: shortcut.to_owned(),
        ..next.clone()
    };
    prefs::save(&state.prefs_path, &next)?;
    apply_theme(app, next.appearance);
    current.clone_from(&next);
    drop(current);
    state.wake_ticker();
    Ok(next)
}
