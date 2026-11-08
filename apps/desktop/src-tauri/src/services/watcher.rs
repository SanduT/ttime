//! Watches the vault folder and emits `vault:changed` with the changed paths.

use std::collections::BTreeSet;
use std::path::Path;
use std::time::Duration;

use notify_debouncer_full::notify::{EventKind, RecommendedWatcher, RecursiveMode};
use notify_debouncer_full::{
    DebounceEventResult, DebouncedEvent, Debouncer, RecommendedCache, new_debouncer,
};
use tauri::AppHandle;
use tauri_specta::Event;

use crate::AppError;
use crate::events::VaultChanged;

/// How long changes are collected before one event is emitted.
const DEBOUNCE: Duration = Duration::from_millis(150);

/// A running watcher. Dropping it stops watching.
pub type VaultWatcher = Debouncer<RecommendedWatcher, RecommendedCache>;

/// Our own atomic-write temp files (`.<name>.<pid>.<n>.tmp`) are not changes worth reporting.
fn is_reported(path: &Path) -> bool {
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy())
        .unwrap_or_default();
    !(name.starts_with('.') && name.ends_with(".tmp"))
}

/// Unique, sorted paths of the events that changed something.
fn changed_paths(events: &[DebouncedEvent]) -> Vec<String> {
    events
        .iter()
        .filter(|event| !matches!(event.kind, EventKind::Access(_)))
        .flat_map(|event| event.paths.iter())
        .filter(|path| is_reported(path))
        .filter_map(|path| path.to_str().map(str::to_owned))
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect()
}

/// Starts watching `root` recursively.
pub fn start(app: AppHandle, root: &Path) -> Result<VaultWatcher, AppError> {
    let mut debouncer =
        new_debouncer(
            DEBOUNCE,
            None,
            move |result: DebounceEventResult| match result {
                Ok(events) => {
                    let paths = changed_paths(&events);
                    if !paths.is_empty()
                        && let Err(err) = (VaultChanged { paths }).emit(&app)
                    {
                        log::warn!("Could not emit vault:changed: {err}");
                    }
                }
                Err(errors) => {
                    for err in errors {
                        log::warn!("Vault watcher error: {err}");
                    }
                }
            },
        )
        .map_err(|err| AppError::Watcher(err.to_string()))?;
    debouncer
        .watch(root, RecursiveMode::Recursive)
        .map_err(|err| AppError::Watcher(err.to_string()))?;
    Ok(debouncer)
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;
    use std::time::Instant;

    use notify_debouncer_full::notify::event::{AccessKind, CreateKind, Event};

    use super::*;

    fn event(kind: EventKind, path: &str) -> DebouncedEvent {
        DebouncedEvent::new(
            Event::new(kind).add_path(PathBuf::from(path)),
            Instant::now(),
        )
    }

    #[test]
    fn reports_unique_changed_paths_without_temp_files_or_reads() {
        let events = [
            event(EventKind::Create(CreateKind::File), "/v/running.json"),
            event(EventKind::Create(CreateKind::File), "/v/running.json"),
            event(
                EventKind::Create(CreateKind::File),
                "/v/.running.json.42.0.tmp",
            ),
            event(EventKind::Access(AccessKind::Read), "/v/ttime.json"),
            event(
                EventKind::Create(CreateKind::File),
                "/v/entries/2026/11/2026-11-08.json",
            ),
        ];
        assert_eq!(
            changed_paths(&events),
            ["/v/entries/2026/11/2026-11-08.json", "/v/running.json"]
        );
    }

    #[test]
    fn hidden_files_that_are_not_temp_files_are_reported() {
        assert!(is_reported(Path::new("/v/.trash")));
        assert!(!is_reported(Path::new("/v/.day.json.1.2.tmp")));
    }
}
