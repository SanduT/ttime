//! ttime desktop shell. Wiring only: plugins, commands, window events and setup.
//! The shell holds no product rules and never parses vault data.

mod commands;
mod error;
mod events;
mod platform;
mod services;
mod state;

pub use error::AppError;
use services::panels::{self, WindowKind};
use state::AppState;
use tauri::Manager;
use tauri_plugin_log::{RotationStrategy, Target, TargetKind};

/// Largest log file before rotation, in bytes.
const LOG_MAX_FILE_SIZE: u128 = 5_000_000;
/// Rotated log files to keep.
const LOG_FILES_KEPT: usize = 5;
/// Argument the login item passes, so a launch at login stays in the menu bar.
const AUTOSTART_ARG: &str = "--autostart";

/// Opening the app again while it runs (Dock, Finder, Spotlight) shows the main window.
fn on_run_event(app: &tauri::AppHandle, event: &tauri::RunEvent) {
    #[cfg(target_os = "macos")]
    if let tauri::RunEvent::Reopen { .. } = event
        && let Err(err) = panels::show(app, WindowKind::Main)
    {
        log::error!("Could not show the main window: {err}");
    }
    #[cfg(not(target_os = "macos"))]
    let _ = (app, event);
}

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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![AUTOSTART_ARG]),
        ))
        .plugin(tauri_nspanel::init())
        .invoke_handler(specta.invoke_handler())
        .setup(move |app| {
            specta.mount_events(app);
            services::activation::set_accessory(app.handle());
            let home_dir = app.path().home_dir()?;
            let prefs_path = app.path().app_config_dir()?.join("prefs.json");
            let prefs = services::prefs::load(&prefs_path);
            let state = AppState::new(
                home_dir.clone(),
                state::config_dir_for(&home_dir),
                prefs_path,
                prefs.clone(),
            );
            let has_vault = services::vault::open_saved(app.handle(), &state);
            let (wake, ticks) = std::sync::mpsc::channel();
            state.set_ticker(wake)?;
            app.manage(state);
            services::quickbar::create(app.handle())?;
            services::settings::apply_saved(app.handle(), &prefs);
            services::tray::create(app.handle())?;
            services::tray::start_ticker(app.handle().clone(), ticks)?;
            services::monitors::start(app.handle().clone())?;
            services::settings::refresh_login_item(app.handle());
            let at_login = std::env::args().any(|arg| arg == AUTOSTART_ARG);
            if !has_vault || !at_login {
                // Opened by hand, or first run (onboarding): show the main window.
                panels::show(app.handle(), WindowKind::Main)?;
            }
            log::info!("ttime started");
            Ok(())
        })
        .on_window_event(panels::on_window_event)
        .build(tauri::generate_context!())?
        .run(|app, event| on_run_event(app, &event));
    Ok(())
}
