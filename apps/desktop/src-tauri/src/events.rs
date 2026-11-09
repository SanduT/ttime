//! Typed events emitted to the webviews.

use serde::{Deserialize, Serialize};

/// Files in the vault changed on disk (by this app, the CLI, a sync tool or a hand edit).
/// Debounced by 150 ms. Paths are absolute.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[tauri_specta(event_name = "vault:changed")]
pub struct VaultChanged {
    pub paths: Vec<String>,
}

/// The quick bar was just shown; the webview resets its input for `mode`.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[tauri_specta(event_name = "quickbar:shown")]
pub struct QuickbarShown {
    pub mode: crate::services::quickbar::QuickbarMode,
}

/// Another vault was opened; every window reloads.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[tauri_specta(event_name = "vault:opened")]
pub struct VaultOpened {
    pub root: String,
}

/// The accent color changed; every window restyles.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[tauri_specta(event_name = "prefs:accent")]
pub struct AccentChanged {
    pub accent: crate::services::prefs::Accent,
}

/// The main window should show Settings (tray menu item).
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[tauri_specta(event_name = "main:open-settings")]
pub struct OpenSettings;

/// A timer action chosen in the tray menu, carried out by the agent webview through the core.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "kebab-case")]
pub enum TrayActionKind {
    Stop,
    Resume,
}

/// The tray menu asks the agent to act on the running entry.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[tauri_specta(event_name = "tray:action")]
pub struct TrayAction {
    pub action: TrayActionKind,
}

/// The user is back after idle time while a timer ran. Times are seconds since the Unix epoch.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[tauri_specta(event_name = "monitor:idle")]
#[serde(rename_all = "camelCase")]
pub struct MonitorIdle {
    /// The last input before going idle (or the last activity before sleep).
    pub since: f64,
    /// The first input after coming back.
    pub returned: f64,
}

/// The running timer passed the forgotten-timer limit again.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[tauri_specta(event_name = "monitor:forgotten")]
#[serde(rename_all = "camelCase")]
pub struct MonitorForgotten {
    pub hours: u32,
    /// The last input, in seconds since the Unix epoch.
    pub last_activity: f64,
}

/// The auto-stop time passed while the user was away: stop the timer at `at`.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[tauri_specta(event_name = "monitor:auto-stop")]
pub struct MonitorAutoStop {
    /// Seconds since the Unix epoch.
    pub at: f64,
}
