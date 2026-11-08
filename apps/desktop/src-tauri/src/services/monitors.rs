//! The monitor thread: every 30 seconds it reads the clock, the system idle time and the
//! running entry, feeds [`Monitor`], and sends what it decides to the agent webview, which
//! acts through the core (ARCHITECTURE 6.6). Sleep shows up as a long gap between ticks.

use std::time::Duration;

use tauri::{AppHandle, Manager};
use tauri_specta::Event;

use crate::AppError;
use crate::events::{MonitorAutoStop, MonitorForgotten, MonitorIdle};
use crate::services::monitor::{self, Monitor, MonitorEvent, TICK_SECONDS, Tick};
use crate::services::panels::WindowKind;
use crate::services::tray::now_epoch;
use crate::state::AppState;

#[cfg(target_os = "macos")]
use crate::platform::macos::idle::{seconds_since_input, utc_offset};

#[cfg(not(target_os = "macos"))]
const fn seconds_since_input() -> f64 {
    0.0
}

#[cfg(not(target_os = "macos"))]
const fn utc_offset(_: i64) -> i64 {
    0
}

#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_precision_loss,
    reason = "epoch seconds and UTC offsets fit easily"
)]
fn observe(app: &AppHandle) -> Result<(monitor::MonitorConfig, Tick), AppError> {
    let state = app.state::<AppState>();
    let config = monitor::config_of(&*state.prefs()?).unwrap_or_default();
    let now = now_epoch();
    let tick = Tick {
        now,
        idle: seconds_since_input(),
        utc_offset: utc_offset(now as i64) as f64,
        running_start: state
            .running()?
            .as_ref()
            .map(|running| running.start_epoch_seconds),
    };
    Ok((config, tick))
}

fn send(app: &AppHandle, event: MonitorEvent) -> Result<(), AppError> {
    let target = WindowKind::Quickbar.label();
    match event {
        MonitorEvent::IdleReturned { since, returned } => {
            MonitorIdle { since, returned }.emit_to(app, target)?;
        }
        MonitorEvent::Forgotten {
            hours,
            last_activity,
        } => MonitorForgotten {
            hours,
            last_activity,
        }
        .emit_to(app, target)?,
        MonitorEvent::AutoStop { at } => MonitorAutoStop { at }.emit_to(app, target)?,
    }
    log::info!("monitor event {event:?}");
    Ok(())
}

/// Starts the monitor thread.
pub fn start(app: AppHandle) -> Result<(), AppError> {
    std::thread::Builder::new()
        .name("monitors".into())
        .spawn(move || {
            let mut monitor = Monitor::default();
            loop {
                match observe(&app) {
                    Ok((config, tick)) => {
                        for event in monitor.tick(config, tick) {
                            if let Err(err) = send(&app, event) {
                                log::error!("Could not send a monitor event: {err}");
                            }
                        }
                    }
                    Err(err) => log::error!("Monitor tick failed: {err}"),
                }
                std::thread::sleep(Duration::from_secs_f64(TICK_SECONDS));
            }
        })
        .map_err(|err| AppError::io("spawn", std::path::Path::new("monitors"), err))?;
    Ok(())
}
