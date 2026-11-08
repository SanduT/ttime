//! Window and agent commands: the quick bar, the main window and the running summary.

use tauri::{AppHandle, State};

use crate::{
    AppError,
    services::{
        menubar::RunningSummary,
        panels::{self, WindowKind},
        popover,
        quickbar::{self, QuickbarMode},
        tray,
    },
    state::AppState,
};

/// Shows the quick bar under the cursor in `mode`.
#[tauri::command]
#[specta::specta]
pub async fn quickbar_show(app: AppHandle, mode: QuickbarMode) -> Result<(), AppError> {
    quickbar::show(&app, mode)
}

/// Hides the quick bar; focus returns to the previous app.
#[tauri::command]
#[specta::specta]
pub async fn quickbar_hide(app: AppHandle) -> Result<(), AppError> {
    quickbar::hide(&app)
}

/// Opens (or focuses) the main window.
#[tauri::command]
#[specta::specta]
pub async fn main_window_show(app: AppHandle) -> Result<(), AppError> {
    panels::show(&app, WindowKind::Main)
}

/// The agent webview reports the running entry (or `null`) after any running-state change, and
/// the label of what Resume would continue (`null` when there is nothing to resume).
#[tauri::command]
#[specta::specta]
pub async fn set_running(
    app: AppHandle,
    state: State<'_, AppState>,
    summary: Option<RunningSummary>,
    resume: Option<String>,
) -> Result<(), AppError> {
    state.running()?.clone_from(&summary);
    tray::show_running(&app, summary.as_ref(), resume.as_deref())
}

/// Hides the menu bar popover.
#[tauri::command]
#[specta::specta]
pub async fn popover_hide(app: AppHandle) -> Result<(), AppError> {
    popover::hide(&app)
}

/// Quits the app.
#[tauri::command]
#[specta::specta]
pub async fn app_quit(app: AppHandle) -> Result<(), AppError> {
    app.exit(0);
    Ok(())
}
