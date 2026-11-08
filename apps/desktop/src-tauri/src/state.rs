//! Shared state of the shell.

use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard, mpsc::Sender};

use crate::AppError;
use crate::services::menubar::RunningSummary;
use crate::services::prefs::Prefs;
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
    ticker: Mutex<Option<Sender<()>>>,
    /// `prefs.json` in the app config directory.
    pub prefs_path: PathBuf,
    prefs: Mutex<Prefs>,
}

impl AppState {
    /// State with no vault open yet.
    #[must_use]
    pub fn new(home_dir: PathBuf, config_dir: PathBuf, prefs_path: PathBuf, prefs: Prefs) -> Self {
        Self {
            home_dir,
            config_dir,
            prefs_path,
            prefs: Mutex::new(prefs),
            vault: Mutex::new(VaultSlot::default()),
            running: Mutex::new(None),
            ticker: Mutex::new(None),
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

    /// The app preferences, locked.
    pub fn prefs(&self) -> Result<MutexGuard<'_, Prefs>, AppError> {
        self.prefs.lock().map_err(|_| AppError::StatePoisoned)
    }

    /// Connects the menu bar ticker, woken by [`AppState::wake_ticker`].
    pub fn set_ticker(&self, wake: Sender<()>) -> Result<(), AppError> {
        *self.ticker.lock().map_err(|_| AppError::StatePoisoned)? = Some(wake);
        Ok(())
    }

    /// Makes the ticker redraw the title now (after the running entry changed).
    pub fn wake_ticker(&self) {
        if let Ok(ticker) = self.ticker.lock()
            && let Some(wake) = ticker.as_ref()
            && wake.send(()).is_err()
        {
            log::warn!("The menu bar ticker has stopped");
        }
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
