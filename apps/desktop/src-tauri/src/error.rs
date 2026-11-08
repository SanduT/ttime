//! The one error type of the shell. Serializes as `{ code, message }` for the webviews,
//! with codes matching the TypeScript `io.*` and `platform.*` codes.

use serde::ser::{Serialize, SerializeStruct, Serializer};

/// Every failure the shell can report.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    /// An error from Tauri itself (windows, tray, plugins).
    #[error(transparent)]
    Tauri(#[from] tauri::Error),
    /// The TypeScript bindings could not be generated.
    #[error("could not write the TypeScript bindings: {0}")]
    Bindings(String),
    /// A file operation failed.
    #[error("could not {operation} {path}: {source}")]
    Io {
        operation: &'static str,
        path: String,
        #[source]
        source: std::io::Error,
    },
    /// A path outside the vault and the ttime config folder, or not absolute.
    #[error("path is not allowed: {0}")]
    PathNotAllowed(String),
    /// A command argument that makes no sense.
    #[error("{0}")]
    InvalidInput(String),
    /// The file watcher could not start.
    #[error("file watcher failed: {0}")]
    Watcher(String),
    /// Shared state is unusable (a thread panicked while holding it).
    #[error("internal state is unavailable")]
    StatePoisoned,
    /// A native panel could not be created or found.
    #[error("panel failed: {0}")]
    Panel(String),
    /// A global shortcut is malformed or taken by another app.
    #[error("{0}")]
    Shortcut(String),
    /// Launch at login could not be read or changed.
    #[error("launch at login failed: {0}")]
    Autostart(String),
}

impl AppError {
    /// Stable code shared with the TypeScript error codes.
    #[must_use]
    pub const fn code(&self) -> &'static str {
        match self {
            Self::Tauri(_) => "platform.tauri",
            Self::Bindings(_) => "platform.bindings",
            Self::Io { .. } => "io.failed",
            Self::PathNotAllowed(_) => "io.path_not_allowed",
            Self::InvalidInput(_) => "input.invalid",
            Self::Watcher(_) => "platform.watcher",
            Self::StatePoisoned => "platform.state",
            Self::Panel(_) => "platform.panel",
            Self::Shortcut(_) => "platform.shortcut",
            Self::Autostart(_) => "platform.autostart",
        }
    }

    /// An [`AppError::Io`] for `operation` on `path`.
    #[must_use]
    pub fn io(operation: &'static str, path: &std::path::Path, source: std::io::Error) -> Self {
        Self::Io {
            operation,
            path: path.display().to_string(),
            source,
        }
    }
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut state = serializer.serialize_struct("AppError", 2)?;
        state.serialize_field("code", self.code())?;
        state.serialize_field("message", &self.to_string())?;
        state.end()
    }
}

/// The shape [`AppError`] serializes to, for the generated TypeScript bindings.
#[derive(specta::Type, serde::Serialize)]
#[serde(rename = "AppError")]
struct AppErrorShape {
    code: String,
    message: String,
}

impl specta::Type for AppError {
    fn definition(types: &mut specta::Types) -> specta::datatype::DataType {
        AppErrorShape::definition(types)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_as_code_and_message() {
        let err = AppError::Bindings("disk full".to_owned());
        let json = serde_json::to_string(&err).unwrap();
        assert_eq!(
            json,
            r#"{"code":"platform.bindings","message":"could not write the TypeScript bindings: disk full"}"#
        );
    }

    #[test]
    fn io_errors_name_the_operation_and_path() {
        let err = AppError::io(
            "read",
            std::path::Path::new("/v/a.json"),
            std::io::Error::other("boom"),
        );
        assert_eq!(err.code(), "io.failed");
        assert_eq!(err.to_string(), "could not read /v/a.json: boom");
    }
}
