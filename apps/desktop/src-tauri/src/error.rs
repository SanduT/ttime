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
}

impl AppError {
    /// Stable code shared with the TypeScript error codes.
    #[must_use]
    pub const fn code(&self) -> &'static str {
        match self {
            Self::Tauri(_) => "platform.tauri",
            Self::Bindings(_) => "platform.bindings",
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
}
