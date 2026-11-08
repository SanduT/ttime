//! Shared state of the shell.

use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};

use crate::AppError;
use crate::services::tray::RunningSummary;
use crate::services::vault_io::AllowList;
use crate::services::watcher::VaultWatcher;

/// The open vault and its watcher.
#[derive(Default)]
pub struct VaultSlot {
    pub root: Option<PathBuf>,
    pub watcher: Option<VaultWatcher>,
}

impl std::fmt::Debug for VaultSlot {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("VaultSlot")
            .field("root", &self.root)
            .field("watching", &self.watcher.is_some())
            .finish()
    }
}

/// State managed by Tauri and shared by every command.
#[derive(Debug)]
pub struct AppState {
    pub home_dir: PathBuf,
    pub config_dir: PathBuf,
    vault: Mutex<VaultSlot>,
    running: Mutex<Option<RunningSummary>>,
}

impl AppState {
    /// State with no vault open yet.
    #[must_use]
    pub fn new(home_dir: PathBuf, config_dir: PathBuf) -> Self {
        Self {
            home_dir,
            config_dir,
            vault: Mutex::new(VaultSlot::default()),
            running: Mutex::new(None),
        }
    }

    /// The vault slot, locked.
    pub fn vault(&self) -> Result<MutexGuard<'_, VaultSlot>, AppError> {
        self.vault.lock().map_err(|_| AppError::StatePoisoned)
    }

    /// The running entry as last pushed by the agent webview, locked.
    pub fn running(&self) -> Result<MutexGuard<'_, Option<RunningSummary>>, AppError> {
        self.running.lock().map_err(|_| AppError::StatePoisoned)
    }

    /// The folders the webviews may touch right now: the config folder and the open vault.
    pub fn allow_list(&self) -> Result<AllowList, AppError> {
        let root = self.vault()?.root.clone();
        Ok(AllowList::new(
            std::iter::once(self.config_dir.clone()).chain(root),
        ))
    }
}

/// `~/.config/ttime`, the same folder the CLI uses for its config and the vault locks.
#[must_use]
pub fn config_dir_for(home_dir: &Path) -> PathBuf {
    home_dir.join(".config").join("ttime")
}
