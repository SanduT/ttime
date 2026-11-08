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
