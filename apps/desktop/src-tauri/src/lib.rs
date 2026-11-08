//! ttime desktop shell. Wiring only: plugins, commands, window events and setup.
//! The shell holds no product rules and never parses vault data.

mod commands;
mod error;
mod services;

pub use error::AppError;
use services::panels::{self, WindowKind};
use tauri_plugin_log::{RotationStrategy, Target, TargetKind};

/// Largest log file before rotation, in bytes.
const LOG_MAX_FILE_SIZE: u128 = 5_000_000;
/// Rotated log files to keep.
const LOG_FILES_KEPT: usize = 5;

fn log_plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let mut targets = vec![Target::new(TargetKind::LogDir { file_name: None })];
    if cfg!(debug_assertions) {
        targets.push(Target::new(TargetKind::Stdout));
    }
    tauri_plugin_log::Builder::new()
        .level(log::LevelFilter::Info)
        .targets(targets)
        .max_file_size(LOG_MAX_FILE_SIZE)
        .rotation_strategy(RotationStrategy::KeepSome(LOG_FILES_KEPT))
        .build()
}

/// Builds and runs the Tauri application.
pub fn run() -> Result<(), AppError> {
    let specta = commands::specta_builder();
    #[cfg(debug_assertions)]
    commands::export_bindings(&specta)?;

    tauri::Builder::default()
        .plugin(log_plugin())
        .invoke_handler(specta.invoke_handler())
        .setup(move |app| {
            specta.mount_events(app);
            services::activation::set_accessory(app.handle());
            panels::create(app.handle(), WindowKind::Quickbar)?;
            services::tray::create(app.handle())?;
            log::info!("ttime started");
            Ok(())
        })
        .on_window_event(panels::on_window_event)
        .run(tauri::generate_context!())?;
    Ok(())
}
