//! IPC handlers, registered with tauri-specta so the TypeScript bindings are generated.

pub mod quickbar;
pub mod settings;
pub mod vault;

use tauri_specta::{Builder, collect_commands, collect_events};

use crate::events::{OpenSettings, QuickbarShown, TrayAction, VaultChanged, VaultOpened};

/// Where the generated TypeScript bindings live, relative to this crate.
pub const BINDINGS_PATH: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../src/shared/bridge/bindings.ts"
);

/// The tauri-specta builder with every command and event of the app.
pub fn specta_builder() -> Builder<tauri::Wry> {
    Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            vault::app_env,
            vault::vault_root,
            vault::vault_set_root,
            vault::vault_read_text,
            vault::vault_write_atomic,
            vault::vault_append_line,
            vault::vault_list,
            vault::vault_mkdirp,
            vault::vault_mkdir_exclusive,
            vault::vault_remove,
            vault::vault_stat,
            vault::vault_reveal,
            vault::vault_open,
            quickbar::quickbar_show,
            quickbar::quickbar_hide,
            quickbar::main_window_show,
            quickbar::set_running,
            quickbar::popover_hide,
            quickbar::app_quit,
            settings::prefs_get,
            settings::prefs_set,
            settings::launch_at_login_get,
            settings::launch_at_login_set,
        ])
        .events(collect_events![
            VaultChanged,
            VaultOpened,
            QuickbarShown,
            TrayAction,
            OpenSettings
        ])
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
