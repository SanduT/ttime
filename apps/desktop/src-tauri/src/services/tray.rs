//! The menu bar item: a template icon when idle, a dot in the project color with the elapsed
//! time while tracking. Left click toggles the popover; right click shows a short menu whose
//! Stop and Resume go to the agent webview.

use std::sync::mpsc::{Receiver, RecvTimeoutError};
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{
    AppHandle, Manager,
    image::Image,
    include_image,
    menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};
use tauri_specta::Event;

use crate::{
    AppError,
    events::{TrayAction, TrayActionKind},
    services::{
        menubar::{self, DOT_SIZE, IDLE_WAIT, RunningSummary},
        panels::{self, WindowKind},
        popover,
        quickbar::{self, QuickbarMode},
    },
    state::AppState,
};

const TRAY_ID: &str = "ttime";
const TOOLTIP: &str = "ttime";
const STOP: &str = "stop";
const RESUME: &str = "resume";
const NEW: &str = "new";
const NOTE: &str = "note";
const SHOW_MAIN: &str = "show-main";
const QUIT: &str = "quit";

/// The first menu item: Stop while tracking, otherwise Resume with what it continues.
fn timer_item(
    app: &AppHandle,
    running: bool,
    resume: Option<&str>,
) -> Result<MenuItem<tauri::Wry>, AppError> {
    let item = match (running, resume) {
        (true, _) => MenuItem::with_id(app, STOP, "Stop", true, None::<&str>)?,
        (false, Some(label)) => {
            MenuItem::with_id(app, RESUME, format!("Resume {label}"), true, None::<&str>)?
        }
        (false, None) => MenuItem::with_id(app, RESUME, "Resume", false, None::<&str>)?,
    };
    Ok(item)
}

fn menu(
    app: &AppHandle,
    running: bool,
    resume: Option<&str>,
) -> Result<Menu<tauri::Wry>, AppError> {
    Ok(Menu::with_items(
        app,
        &[
            &timer_item(app, running, resume)?,
            &MenuItem::with_id(app, NEW, "New Entry…", true, None::<&str>)?,
            &MenuItem::with_id(app, NOTE, "Add Note…", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, SHOW_MAIN, "Open ttime", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, QUIT, "Quit ttime", true, Some("CmdOrCtrl+Q"))?,
        ],
    )?)
}

/// Creates the menu bar item.
pub fn create(app: &AppHandle) -> Result<(), AppError> {
    TrayIconBuilder::with_id(TRAY_ID)
        .icon(include_image!("icons/tray.png"))
        .icon_as_template(true)
        .tooltip(TOOLTIP)
        .menu(&menu(app, false, None)?)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| on_menu_event(app, &event))
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                rect,
                ..
            } = event
                && let Err(err) = popover::toggle(tray.app_handle(), rect)
            {
                log::error!("Could not toggle the popover: {err}");
            }
        })
        .build(app)?;
    Ok(())
}

/// Shows `summary` (or idle): icon, menu and title. `resume` labels the idle Resume item. Wakes
/// the ticker for the new title.
pub fn show_running(
    app: &AppHandle,
    summary: Option<&RunningSummary>,
    resume: Option<&str>,
) -> Result<(), AppError> {
    let Some(tray) = app.tray_by_id(TRAY_ID) else {
        return Ok(());
    };
    if let Some(running) = summary {
        let pixels = menubar::dot_rgba(&running.color, DOT_SIZE);
        tray.set_icon(Some(Image::new_owned(pixels, DOT_SIZE, DOT_SIZE)))?;
        tray.set_icon_as_template(false)?;
    } else {
        tray.set_icon(Some(include_image!("icons/tray.png")))?;
        tray.set_icon_as_template(true)?;
    }
    tray.set_menu(Some(menu(app, summary.is_some(), resume)?))?;
    app.state::<AppState>().wake_ticker();
    Ok(())
}

fn now_epoch() -> f64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0.0, |since| since.as_secs_f64())
}

/// Sets the title from the stored summary; returns how long until it changes.
fn refresh_title(app: &AppHandle) -> Result<std::time::Duration, AppError> {
    let state = app.state::<AppState>();
    let summary = state.running()?.clone();
    let now = now_epoch();
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        tray.set_title(menubar::title(summary.as_ref(), now))?;
    }
    Ok(summary.map_or(IDLE_WAIT, |running| {
        menubar::next_tick(menubar::elapsed_seconds(running.start_epoch_seconds, now))
    }))
}

/// Starts the title ticker: one update per minute boundary while tracking, and on every wake.
pub fn start_ticker(app: AppHandle, wake: Receiver<()>) -> Result<(), AppError> {
    std::thread::Builder::new()
        .name("menu-bar-ticker".into())
        .spawn(move || {
            loop {
                let wait = refresh_title(&app).unwrap_or_else(|err| {
                    log::error!("Could not update the menu bar title: {err}");
                    IDLE_WAIT
                });
                if let Err(RecvTimeoutError::Disconnected) = wake.recv_timeout(wait) {
                    break;
                }
            }
        })
        .map_err(|err| AppError::io("start", std::path::Path::new("menu bar ticker"), err))?;
    Ok(())
}

fn emit_action(app: &AppHandle, action: TrayActionKind) -> Result<(), AppError> {
    TrayAction { action }.emit_to(app, WindowKind::Quickbar.label())?;
    Ok(())
}

fn on_menu_event(app: &AppHandle, event: &MenuEvent) {
    let result = match event.id().as_ref() {
        STOP => emit_action(app, TrayActionKind::Stop),
        RESUME => emit_action(app, TrayActionKind::Resume),
        NEW => quickbar::show(app, QuickbarMode::New),
        NOTE => quickbar::show(app, QuickbarMode::Note),
        SHOW_MAIN => panels::show(app, WindowKind::Main),
        QUIT => {
            app.exit(0);
            Ok(())
        }
        other => {
            log::warn!("Unknown tray menu item: {other}");
            Ok(())
        }
    };
    if let Err(err) = result {
        log::error!("Tray menu action failed: {err}");
    }
}
