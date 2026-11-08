//! App preferences and launch at login, for the Settings view.

use tauri::{AppHandle, State};
use tauri_plugin_autostart::ManagerExt;

use crate::AppError;
use crate::services::prefs::Prefs;
use crate::services::settings;
use crate::state::AppState;

/// The app preferences in effect.
#[tauri::command]
#[specta::specta]
pub async fn prefs_get(state: State<'_, AppState>) -> Result<Prefs, AppError> {
    Ok(state.prefs()?.clone())
}

/// Applies and saves `prefs`. A shortcut another app owns fails with `platform.shortcut` and
/// leaves the old one working.
#[tauri::command]
#[specta::specta]
pub async fn prefs_set(app: AppHandle, prefs: Prefs) -> Result<Prefs, AppError> {
    settings::update(&app, &prefs)
}

/// Whether ttime starts at login (a `LaunchAgent` on macOS).
#[tauri::command]
#[specta::specta]
pub async fn launch_at_login_get(app: AppHandle) -> Result<bool, AppError> {
    app.autolaunch()
        .is_enabled()
        .map_err(|err| AppError::Autostart(err.to_string()))
}

/// Turns launch at login on or off.
#[tauri::command]
#[specta::specta]
pub async fn launch_at_login_set(app: AppHandle, enabled: bool) -> Result<(), AppError> {
    let launcher = app.autolaunch();
    let result = if enabled {
        launcher.enable()
    } else {
        launcher.disable()
    };
    result.map_err(|err| AppError::Autostart(err.to_string()))
}
