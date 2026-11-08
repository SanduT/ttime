//! App preferences (ARCHITECTURE 6.1): hotkey, menu bar display and appearance. They live in
//! `prefs.json` in the app config directory, outside the vault. Vault-level settings live in
//! `ttime.json` and are handled by the core.

use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::AppError;
use crate::services::vault_io;

/// What the menu bar shows while tracking.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "kebab-case")]
pub enum MenuBarDisplay {
    /// The elapsed time next to the project dot (PRD default).
    #[default]
    Time,
    /// The project name and the elapsed time.
    ProjectAndTime,
    /// The project dot only.
    Icon,
}

/// Light or dark mode for every window.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "kebab-case")]
pub enum Appearance {
    #[default]
    System,
    Light,
    Dark,
}

/// Default global shortcut for the quick bar (PRD 6.1).
pub const DEFAULT_SHORTCUT: &str = "Alt+Shift+Space";

/// The app preferences. Missing keys take their defaults.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase", default)]
pub struct Prefs {
    /// Accelerator that toggles the quick bar, like `Alt+Shift+Space`.
    pub quickbar_shortcut: String,
    pub menu_bar_display: MenuBarDisplay,
    /// Show seconds in the menu bar time.
    pub show_seconds: bool,
    pub appearance: Appearance,
}

impl Default for Prefs {
    fn default() -> Self {
        Self {
            quickbar_shortcut: DEFAULT_SHORTCUT.to_owned(),
            menu_bar_display: MenuBarDisplay::default(),
            show_seconds: false,
            appearance: Appearance::default(),
        }
    }
}

/// Reads `path`. A missing file gives the defaults; a broken one also gives the defaults (and a
/// warning) and is left alone until the next save.
#[must_use]
pub fn load(path: &Path) -> Prefs {
    match vault_io::read_text(path) {
        Ok(Some(text)) => serde_json::from_str(&text).unwrap_or_else(|err| {
            log::warn!("Ignoring invalid preferences in {}: {err}", path.display());
            Prefs::default()
        }),
        Ok(None) => Prefs::default(),
        Err(err) => {
            log::warn!("Could not read preferences: {err}");
            Prefs::default()
        }
    }
}

/// Writes `prefs` to `path` atomically, creating its folder.
pub fn save(path: &Path, prefs: &Prefs) -> Result<(), AppError> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|err| AppError::io("create", dir, err))?;
    }
    let text = serde_json::to_string_pretty(prefs)
        .map_err(|err| AppError::InvalidInput(format!("could not encode preferences: {err}")))?;
    vault_io::write_atomic(path, &format!("{text}\n"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_or_broken_files_give_the_defaults() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("prefs.json");
        assert_eq!(load(&path), Prefs::default());
        std::fs::write(&path, "{ not json").unwrap();
        assert_eq!(load(&path), Prefs::default());
    }

    #[test]
    fn saved_prefs_load_back_and_missing_keys_default() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nested/prefs.json");
        let prefs = Prefs {
            quickbar_shortcut: "Cmd+Shift+K".into(),
            menu_bar_display: MenuBarDisplay::ProjectAndTime,
            show_seconds: true,
            appearance: Appearance::Dark,
        };
        save(&path, &prefs).unwrap();
        assert_eq!(load(&path), prefs);
        std::fs::write(&path, r#"{"appearance":"light"}"#).unwrap();
        assert_eq!(load(&path).quickbar_shortcut, DEFAULT_SHORTCUT);
    }
}
