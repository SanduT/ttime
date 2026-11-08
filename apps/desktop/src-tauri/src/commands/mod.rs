//! IPC handlers, registered with tauri-specta so the TypeScript bindings are generated.

use tauri_specta::{Builder, collect_commands};

/// Where the generated TypeScript bindings live, relative to this crate.
pub const BINDINGS_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../src/shared/bridge/bindings.ts"
);

/// The tauri-specta builder with every command and event of the app.
pub fn specta_builder() -> Builder<tauri::Wry> {
    Builder::<tauri::Wry>::new().commands(collect_commands![])
}

/// Writes the TypeScript bindings for `builder` to `path`.
pub fn export_bindings_to(
    builder: &Builder<tauri::Wry>,
    path: &str,
) -> Result<(), crate::AppError> {
    builder
        .export(specta_typescript::Typescript::default(), path)
        .map_err(|err| crate::AppError::Bindings(err.to_string()))
}

/// Regenerates the committed bindings file (debug builds only).
#[cfg(debug_assertions)]
pub fn export_bindings(builder: &Builder<tauri::Wry>) -> Result<(), crate::AppError> {
    export_bindings_to(builder, BINDINGS_PATH)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn committed_bindings_match_the_commands() {
        let dir = std::env::temp_dir().join(format!("ttime-bindings-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let generated = dir.join("bindings.ts");
        export_bindings_to(&specta_builder(), generated.to_str().unwrap()).unwrap();
        let expected = std::fs::read_to_string(BINDINGS_PATH).unwrap();
        let actual = std::fs::read_to_string(&generated).unwrap();
        std::fs::remove_dir_all(&dir).unwrap();
        assert_eq!(
            actual, expected,
            "run `bun run gen:bindings` to regenerate the bindings"
        );
    }

    /// Regenerates the committed bindings without launching the app: `bun run gen:bindings`.
    #[test]
    #[ignore = "writes the committed bindings file; run explicitly"]
    fn write_bindings() {
        export_bindings_to(&specta_builder(), BINDINGS_PATH).unwrap();
    }
}
