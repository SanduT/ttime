//! Choosing the open vault: validates the folder, remembers it and restarts the watcher.
//! The config file itself is written by the webview through the core.

use std::path::{Path, PathBuf};

use serde::Deserialize;
use tauri::AppHandle;

use crate::AppError;
use crate::services::{vault_io, watcher};
use crate::state::AppState;

/// Makes `path` the open vault. It must be an existing folder, not the file system root or
/// the home folder itself. Returns the resolved path.
pub fn open(app: &AppHandle, state: &AppState, path: &Path) -> Result<PathBuf, AppError> {
    if !path.is_absolute() {
        return Err(AppError::InvalidInput(format!(
            "the vault path must be absolute: {}",
            path.display()
        )));
    }
    let root = vault_io::resolve(path)?;
    if !root.is_dir() {
        return Err(AppError::InvalidInput(format!(
            "the vault must be an existing folder: {}",
            root.display()
        )));
    }
    let home = vault_io::resolve(&state.home_dir)?;
    if root.parent().is_none() || root == home {
        return Err(AppError::InvalidInput(format!(
            "choose a folder for the vault, not {}",
            root.display()
        )));
    }
    let watcher = watcher::start(app.clone(), &root)?;
    let mut slot = state.vault()?;
    slot.root = Some(root.clone());
    slot.watcher = Some(watcher);
    log::info!("Vault opened");
    Ok(root)
}

#[derive(Deserialize)]
struct ConfigFile {
    vault: Option<String>,
}

/// The vault path saved in `<config_dir>/config.json`, if any. Problems are logged and
/// treated as "no vault", so the app falls back to onboarding.
#[must_use]
pub fn saved_root(config_dir: &Path) -> Option<PathBuf> {
    let path = config_dir.join("config.json");
    let text = match vault_io::read_text(&path) {
        Ok(text) => text?,
        Err(err) => {
            log::warn!("Could not read the config file: {err}");
            return None;
        }
    };
    match serde_json::from_str::<ConfigFile>(&text) {
        Ok(config) => config.vault.map(PathBuf::from),
        Err(err) => {
            log::warn!("Config file is invalid: {err}");
            None
        }
    }
}

/// Opens the saved vault at launch. Returns `false` when there is none or it can't be opened.
pub fn open_saved(app: &AppHandle, state: &AppState) -> bool {
    let Some(root) = saved_root(&state.config_dir) else {
        return false;
    };
    match open(app, state, &root) {
        Ok(_) => true,
        Err(err) => {
            log::warn!("Could not open the saved vault: {err}");
            false
        }
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;

    #[test]
    fn saved_root_reads_the_vault_and_ignores_other_keys() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(
            dir.path().join("config.json"),
            r#"{ "vault": "/Users/me/ttime", "theme": "dark" }"#,
        )
        .unwrap();
        assert_eq!(
            saved_root(dir.path()),
            Some(PathBuf::from("/Users/me/ttime"))
        );
    }

    #[test]
    fn missing_or_invalid_config_means_no_vault() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(saved_root(dir.path()), None);
        fs::write(dir.path().join("config.json"), "{ broken").unwrap();
        assert_eq!(saved_root(dir.path()), None);
        fs::write(dir.path().join("config.json"), "{}").unwrap();
        assert_eq!(saved_root(dir.path()), None);
    }
}
