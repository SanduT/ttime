//! File commands for the webviews. Each path is checked against the allow-list first.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::AppError;
use crate::services::vault;
use crate::services::vault_io::{self, DirEntry, FileStat};
use crate::state::AppState;

/// Where things live for the core's `EnvPort`.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AppEnv {
    pub platform: String,
    pub home_dir: String,
    pub config_dir: String,
    pub pid: u32,
}

fn checked(state: &AppState, path: &str) -> Result<PathBuf, AppError> {
    state.allow_list()?.check(path)
}

/// Platform, home folder, ttime config folder and process ID.
#[tauri::command]
#[specta::specta]
pub async fn app_env(state: State<'_, AppState>) -> Result<AppEnv, AppError> {
    Ok(AppEnv {
        platform: "macos".to_owned(),
        home_dir: state.home_dir.display().to_string(),
        config_dir: state.config_dir.display().to_string(),
        pid: std::process::id(),
    })
}

/// The open vault folder, or `null` before one is chosen.
#[tauri::command]
#[specta::specta]
pub async fn vault_root(state: State<'_, AppState>) -> Result<Option<String>, AppError> {
    Ok(state
        .vault()?
        .root
        .as_ref()
        .map(|root| root.display().to_string()))
}

/// Makes `path` the open vault and starts watching it. Returns the resolved path.
#[tauri::command]
#[specta::specta]
pub async fn vault_set_root(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> Result<String, AppError> {
    let root = vault::open(&app, &state, &PathBuf::from(path))?;
    Ok(root.display().to_string())
}

/// File contents, or `null` when missing.
#[tauri::command]
#[specta::specta]
pub async fn vault_read_text(
    state: State<'_, AppState>,
    path: String,
) -> Result<Option<String>, AppError> {
    vault_io::read_text(&checked(&state, &path)?)
}

/// Atomic write: temp file, sync, rename.
#[tauri::command]
#[specta::specta]
pub async fn vault_write_atomic(
    state: State<'_, AppState>,
    path: String,
    text: String,
) -> Result<(), AppError> {
    vault_io::write_atomic(&checked(&state, &path)?, &text)
}

/// Appends a line plus a newline.
#[tauri::command]
#[specta::specta]
pub async fn vault_append_line(
    state: State<'_, AppState>,
    path: String,
    line: String,
) -> Result<(), AppError> {
    vault_io::append_line(&checked(&state, &path)?, &line)
}

/// Direct children, empty for a missing folder.
#[tauri::command]
#[specta::specta]
pub async fn vault_list(
    state: State<'_, AppState>,
    path: String,
) -> Result<Vec<DirEntry>, AppError> {
    vault_io::list(&checked(&state, &path)?)
}

/// Creates a folder and its parents.
#[tauri::command]
#[specta::specta]
pub async fn vault_mkdirp(state: State<'_, AppState>, path: String) -> Result<(), AppError> {
    vault_io::mkdirp(&checked(&state, &path)?)
}

/// Creates a folder; `false` if it exists.
#[tauri::command]
#[specta::specta]
pub async fn vault_mkdir_exclusive(
    state: State<'_, AppState>,
    path: String,
) -> Result<bool, AppError> {
    vault_io::mkdir_exclusive(&checked(&state, &path)?)
}

/// Removes a file or folder. The allowed roots themselves can't be removed.
#[tauri::command]
#[specta::specta]
pub async fn vault_remove(
    state: State<'_, AppState>,
    path: String,
    recursive: bool,
) -> Result<(), AppError> {
    let allow = state.allow_list()?;
    let resolved = allow.check(&path)?;
    if allow.is_root(&resolved) {
        return Err(AppError::PathNotAllowed(path));
    }
    vault_io::remove(&resolved, recursive)
}

/// Metadata, or `null` when missing.
#[tauri::command]
#[specta::specta]
pub async fn vault_stat(
    state: State<'_, AppState>,
    path: String,
) -> Result<Option<FileStat>, AppError> {
    vault_io::stat(&checked(&state, &path)?)
}
