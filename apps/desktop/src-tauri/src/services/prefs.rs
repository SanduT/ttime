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

/// The app's accent color: Ember by default, Jade and Iris as themes.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "kebab-case")]
pub enum Accent {
    #[default]
    Ember,
    Jade,
    Iris,
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
    pub accent: Accent,
    /// Ask about idle time after this many minutes without input; 0 turns it off.
    pub idle_minutes: u32,
    /// Remind while a timer runs this many hours, repeating; 0 turns it off.
    pub forgotten_hours: u32,
    /// Stop a timer still running after this local time (`HH:MM`), at the last activity.
    pub auto_stop: Option<String>,
}

/// Default idle threshold in minutes (PRD 6.5).
pub const DEFAULT_IDLE_MINUTES: u32 = 10;
/// Default forgotten-timer limit in hours (PRD 6.5).
pub const DEFAULT_FORGOTTEN_HOURS: u32 = 4;

impl Default for Prefs {
    fn default() -> Self {
        Self {
            quickbar_shortcut: DEFAULT_SHORTCUT.to_owned(),
            menu_bar_display: MenuBarDisplay::default(),
            show_seconds: false,
            appearance: Appearance::default(),
            accent: Accent::default(),
            idle_minutes: DEFAULT_IDLE_MINUTES,
            forgotten_hours: DEFAULT_FORGOTTEN_HOURS,
            auto_stop: None,
        }
    }
}

/// Bundle identifier used before DEC-84; its preferences are copied over once.
const LEGACY_IDENTIFIER: &str = "com.sandut.ttime";

/// Copies `prefs.json` from the old identifier's folder when `path` does not exist yet.
pub fn migrate_legacy(path: &Path) {
    let Some(legacy) = path
        .parent()
        .and_then(Path::parent)
        .map(|dir| dir.join(LEGACY_IDENTIFIER).join("prefs.json"))
    else {
        return;
    };
    if path.exists() || !legacy.exists() {
        return;
    }
    let copied = path
        .parent()
        .map_or(Ok(()), std::fs::create_dir_all)
        .and_then(|()| std::fs::copy(&legacy, path));
    match copied {
        Ok(_) => log::info!("Copied preferences from {LEGACY_IDENTIFIER}"),
        Err(err) => log::warn!("Could not copy preferences from {LEGACY_IDENTIFIER}: {err}"),
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
    fn copies_prefs_from_the_legacy_identifier_once() {
        let dir = tempfile::tempdir().unwrap();
        let legacy = dir.path().join(LEGACY_IDENTIFIER).join("prefs.json");
        std::fs::create_dir_all(legacy.parent().unwrap()).unwrap();
        std::fs::write(&legacy, "old").unwrap();
        let path = dir.path().join("io.github.sandut.ttime").join("prefs.json");
        migrate_legacy(&path);
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "old");
        std::fs::write(&path, "new").unwrap();
        migrate_legacy(&path);
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "new");
    }

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
            accent: Accent::Iris,
            idle_minutes: 15,
            forgotten_hours: 0,
            auto_stop: Some("18:00".into()),
        };
        save(&path, &prefs).unwrap();
        assert_eq!(load(&path), prefs);
        std::fs::write(&path, r#"{"appearance":"light"}"#).unwrap();
        assert_eq!(load(&path).quickbar_shortcut, DEFAULT_SHORTCUT);
        assert_eq!(load(&path).idle_minutes, DEFAULT_IDLE_MINUTES);
        assert_eq!(load(&path).accent, Accent::Ember);
    }
}
