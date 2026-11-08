//! Byte-level file access for the webviews, limited to an allow-list of folders (the open
//! vault and the ttime config folder). Never interprets file contents.

use std::ffi::OsStr;
use std::fs::{self, File, OpenOptions};
use std::io::{ErrorKind, Write};
use std::path::{Component, Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::UNIX_EPOCH;

use serde::{Deserialize, Serialize};

use crate::AppError;

/// One entry of a directory listing.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DirEntry {
    pub name: String,
    pub is_dir: bool,
}

/// File metadata. Numbers are `f64` because the bindings forbid 64-bit integers.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct FileStat {
    pub mtime_ms: f64,
    pub size: f64,
}

/// Folders the webviews may touch. A path is allowed when, after resolving symlinks, it is
/// one of the roots or inside one.
#[derive(Debug, Clone)]
pub struct AllowList {
    roots: Vec<PathBuf>,
}

impl AllowList {
    /// Builds the list; roots that can't be resolved are left out.
    pub fn new(roots: impl IntoIterator<Item = PathBuf>) -> Self {
        let roots = roots
            .into_iter()
            .filter_map(|root| resolve(&root).ok())
            .collect();
        Self { roots }
    }

    /// Resolves `path` and checks it against the roots. Relative paths and `.` or `..`
    /// components are rejected before touching the disk.
    pub fn check(&self, path: &str) -> Result<PathBuf, AppError> {
        let raw = Path::new(path);
        // `Path::components` silently drops interior `.` segments, so check the raw text too.
        let plain = raw
            .components()
            .all(|c| matches!(c, Component::RootDir | Component::Normal(_)))
            && !path
                .split('/')
                .any(|segment| segment == "." || segment == "..");
        if !raw.is_absolute() || !plain {
            return Err(AppError::PathNotAllowed(path.to_owned()));
        }
        let resolved = resolve(raw)?;
        if self.roots.iter().any(|root| resolved.starts_with(root)) {
            Ok(resolved)
        } else {
            Err(AppError::PathNotAllowed(path.to_owned()))
        }
    }

    /// True when `path` (already resolved) is one of the roots.
    #[must_use]
    pub fn is_root(&self, path: &Path) -> bool {
        self.roots.iter().any(|root| root == path)
    }
}

/// Canonicalizes the longest existing prefix of `path` and appends the rest. A missing
/// component that is a dangling symlink is rejected, so a later write can't escape.
pub fn resolve(path: &Path) -> Result<PathBuf, AppError> {
    let mut current = path;
    let mut missing: Vec<&OsStr> = Vec::new();
    loop {
        match fs::canonicalize(current) {
            Ok(mut base) => {
                base.extend(missing.iter().rev());
                return Ok(base);
            }
            Err(err) if err.kind() == ErrorKind::NotFound => {
                if fs::symlink_metadata(current).is_ok() {
                    return Err(AppError::PathNotAllowed(path.display().to_string()));
                }
                let (Some(parent), Some(name)) = (current.parent(), current.file_name()) else {
                    return Err(AppError::io("resolve", path, err));
                };
                missing.push(name);
                current = parent;
            }
            Err(err) => return Err(AppError::io("resolve", path, err)),
        }
    }
}

/// File contents, or `None` when the file does not exist.
pub fn read_text(path: &Path) -> Result<Option<String>, AppError> {
    match fs::read_to_string(path) {
        Ok(text) => Ok(Some(text)),
        Err(err) if err.kind() == ErrorKind::NotFound => Ok(None),
        Err(err) => Err(AppError::io("read", path, err)),
    }
}

static TEMP_COUNTER: AtomicU64 = AtomicU64::new(0);

fn temp_path(path: &Path) -> Result<PathBuf, AppError> {
    let (Some(dir), Some(name)) = (path.parent(), path.file_name()) else {
        return Err(AppError::InvalidInput(format!(
            "not a file path: {}",
            path.display()
        )));
    };
    let count = TEMP_COUNTER.fetch_add(1, Ordering::Relaxed);
    let temp = format!(
        ".{}.{}.{count}.tmp",
        name.to_string_lossy(),
        std::process::id()
    );
    Ok(dir.join(temp))
}

fn write_temp(temp: &Path, text: &str) -> std::io::Result<()> {
    let mut file = OpenOptions::new().write(true).create_new(true).open(temp)?;
    file.write_all(text.as_bytes())?;
    file.sync_all()
}

/// Writes a temp file next to `path`, syncs it, renames it over `path`, then syncs the
/// folder. Readers see the old or the new file, never a partial one.
pub fn write_atomic(path: &Path, text: &str) -> Result<(), AppError> {
    let temp = temp_path(path)?;
    let result = write_temp(&temp, text).and_then(|()| fs::rename(&temp, path));
    if let Err(err) = result {
        // Best effort: the temp file may not exist if creating it was what failed.
        let _ignored = fs::remove_file(&temp);
        return Err(AppError::io("write", path, err));
    }
    if let Some(dir) = path.parent() {
        File::open(dir)
            .and_then(|handle| handle.sync_all())
            .map_err(|err| AppError::io("sync", dir, err))?;
    }
    Ok(())
}

/// Appends `line` plus a newline, creating the file if needed.
pub fn append_line(path: &Path, line: &str) -> Result<(), AppError> {
    OpenOptions::new()
        .append(true)
        .create(true)
        .open(path)
        .and_then(|mut file| file.write_all(format!("{line}\n").as_bytes()))
        .map_err(|err| AppError::io("append to", path, err))
}

/// Direct children sorted by name; empty when `dir` does not exist. Names that are not
/// valid UTF-8 are skipped (vault files never have them).
pub fn list(dir: &Path) -> Result<Vec<DirEntry>, AppError> {
    let reader = match fs::read_dir(dir) {
        Ok(reader) => reader,
        Err(err) if err.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
        Err(err) => return Err(AppError::io("list", dir, err)),
    };
    let mut entries = Vec::new();
    for entry in reader {
        let entry = entry.map_err(|err| AppError::io("list", dir, err))?;
        let Ok(name) = entry.file_name().into_string() else {
            continue;
        };
        let is_dir = fs::metadata(entry.path()).is_ok_and(|meta| meta.is_dir());
        entries.push(DirEntry { name, is_dir });
    }
    entries.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(entries)
}

/// Creates `path` and missing parents.
pub fn mkdirp(path: &Path) -> Result<(), AppError> {
    fs::create_dir_all(path).map_err(|err| AppError::io("create", path, err))
}

/// Creates `path` (its parent must exist). `false` when it already exists: the lock primitive.
pub fn mkdir_exclusive(path: &Path) -> Result<bool, AppError> {
    match fs::create_dir(path) {
        Ok(()) => Ok(true),
        Err(err) if err.kind() == ErrorKind::AlreadyExists => Ok(false),
        Err(err) => Err(AppError::io("create", path, err)),
    }
}

/// Removes a file or folder. Missing paths are ignored; a non-empty folder needs `recursive`.
pub fn remove(path: &Path, recursive: bool) -> Result<(), AppError> {
    let meta = match fs::symlink_metadata(path) {
        Ok(meta) => meta,
        Err(err) if err.kind() == ErrorKind::NotFound => return Ok(()),
        Err(err) => return Err(AppError::io("remove", path, err)),
    };
    let result = match (meta.is_dir(), recursive) {
        (true, true) => fs::remove_dir_all(path),
        (true, false) => fs::remove_dir(path),
        (false, _) => fs::remove_file(path),
    };
    result.map_err(|err| AppError::io("remove", path, err))
}

/// Metadata, or `None` when the path does not exist.
#[expect(
    clippy::cast_precision_loss,
    reason = "file sizes and millisecond times stay far below 2^53"
)]
pub fn stat(path: &Path) -> Result<Option<FileStat>, AppError> {
    let meta = match fs::metadata(path) {
        Ok(meta) => meta,
        Err(err) if err.kind() == ErrorKind::NotFound => return Ok(None),
        Err(err) => return Err(AppError::io("stat", path, err)),
    };
    let modified = meta
        .modified()
        .map_err(|err| AppError::io("stat", path, err))?;
    let mtime_ms = modified
        .duration_since(UNIX_EPOCH)
        .map_or(0.0, |elapsed| elapsed.as_secs_f64() * 1000.0);
    Ok(Some(FileStat {
        mtime_ms,
        size: meta.len() as f64,
    }))
}

#[cfg(test)]
#[path = "vault_io_tests.rs"]
mod tests;
