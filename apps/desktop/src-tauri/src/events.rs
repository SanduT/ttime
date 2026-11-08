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
