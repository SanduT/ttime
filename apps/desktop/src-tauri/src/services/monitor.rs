//! Idle, sleep, forgotten-timer and auto-stop decisions (PRD 6.5), as a pure state machine fed one
//! [`Tick`] at a time. The thread in `monitors.rs` reads the clock and the system idle time and
//! acts on the events; tests drive it with a fake clock.

use crate::AppError;
use crate::services::prefs::Prefs;

const MAX_IDLE_MINUTES: u32 = 240;
const MAX_FORGOTTEN_HOURS: u32 = 24;

/// Seconds between ticks of the monitor thread.
pub const TICK_SECONDS: f64 = 30.0;
/// A tick arriving this much later than the previous one means the Mac slept in between.
const SLEEP_GAP: f64 = 90.0;
/// Input this recent counts as being back at the Mac.
const BACK_WITHIN: f64 = TICK_SECONDS + 5.0;
/// After the auto-stop time, the timer stops once the Mac has had no input this long.
const AUTO_STOP_IDLE: f64 = 5.0 * 60.0;
const DAY: f64 = 86_400.0;

/// What the monitors watch for, from the app preferences. `None` turns a monitor off.
#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct MonitorConfig {
    pub idle_after: Option<f64>,
    pub forgotten_hours: Option<u32>,
    /// Minutes after local midnight.
    pub auto_stop_minute: Option<u32>,
}

/// The monitor settings in `prefs`; an `auto_stop` that is not `HH:MM` is invalid input.
pub fn config_of(prefs: &Prefs) -> Result<MonitorConfig, AppError> {
    if prefs.idle_minutes > MAX_IDLE_MINUTES || prefs.forgotten_hours > MAX_FORGOTTEN_HOURS {
        return Err(AppError::InvalidInput(format!(
            "Use up to {MAX_IDLE_MINUTES} idle minutes and {MAX_FORGOTTEN_HOURS} hours for the timer reminder."
        )));
    }
    let auto_stop_minute = prefs.auto_stop.as_deref().map(minute_of).transpose()?;
    Ok(MonitorConfig {
        idle_after: (prefs.idle_minutes > 0).then(|| f64::from(prefs.idle_minutes) * 60.0),
        forgotten_hours: (prefs.forgotten_hours > 0).then_some(prefs.forgotten_hours),
        auto_stop_minute,
    })
}

/// Minutes after midnight of `HH:MM`.
fn minute_of(time: &str) -> Result<u32, AppError> {
    let invalid = || AppError::InvalidInput(format!("Use a time like 18:00, not \"{time}\"."));
    let (hours, minutes) = time.split_once(':').ok_or_else(invalid)?;
    let hours: u32 = hours.parse().map_err(|_| invalid())?;
    let minutes: u32 = minutes.parse().map_err(|_| invalid())?;
    if hours > 23 || minutes > 59 || time.len() != 5 {
        return Err(invalid());
    }
    Ok(hours * 60 + minutes)
}

/// One observation.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Tick {
    /// Seconds since the Unix epoch.
    pub now: f64,
    /// Seconds since the last keyboard, mouse or trackpad input.
    pub idle: f64,
    /// Local time minus UTC, in seconds, at `now`.
    pub utc_offset: f64,
    /// Start of the running entry, or `None` when nothing runs.
    pub running_start: Option<f64>,
}

/// What the app should do.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum MonitorEvent {
    /// The user is back after `since`; ask what to do with the time up to `returned`.
    IdleReturned { since: f64, returned: f64 },
    /// The timer has run `hours` hours; the last input was at `last_activity`.
    Forgotten { hours: u32, last_activity: f64 },
    /// Stop the timer at `at`, the last activity after the auto-stop time.
    AutoStop { at: f64 },
}

/// State carried between ticks.
#[derive(Debug, Default)]
pub struct Monitor {
    running_start: Option<f64>,
    last_tick: Option<f64>,
    last_activity: f64,
    idle_since: Option<f64>,
    forgotten_sent: u32,
    auto_stopped_at: Option<f64>,
}

impl Monitor {
    /// Takes one observation and returns what to do now.
    pub fn tick(&mut self, config: MonitorConfig, tick: Tick) -> Vec<MonitorEvent> {
        let previous = self.last_tick.replace(tick.now);
        let Some(start) = tick.running_start else {
            self.running_start = None;
            return Vec::new();
        };
        if self.running_start != Some(start) {
            *self = Self {
                running_start: Some(start),
                last_tick: Some(tick.now),
                last_activity: start,
                ..Self::default()
            };
        }
        let slept = previous.is_some_and(|prev| tick.now - prev > SLEEP_GAP);
        let mut events = Vec::new();
        // Auto-stop first: after a sleep it must use the activity from before the sleep.
        if self.watch_auto_stop(config, tick, start, slept, &mut events) {
            return events;
        }
        self.watch_idle(config, tick, slept, start, &mut events);
        self.watch_forgotten(config, tick.now - start, &mut events);
        events
    }

    fn watch_idle(
        &mut self,
        config: MonitorConfig,
        tick: Tick,
        slept: bool,
        start: f64,
        events: &mut Vec<MonitorEvent>,
    ) {
        let last_input = (tick.now - tick.idle).max(start);
        if let Some(threshold) = config.idle_after
            && self.idle_since.is_none()
        {
            if slept && tick.now - self.last_activity >= threshold {
                self.idle_since = Some(self.last_activity);
            } else if tick.idle >= threshold {
                self.idle_since = Some(last_input);
            }
        }
        match self.idle_since {
            Some(since) if tick.idle < BACK_WITHIN => {
                self.idle_since = None;
                self.last_activity = last_input;
                events.push(MonitorEvent::IdleReturned {
                    since,
                    returned: last_input,
                });
            }
            Some(_) => {}
            None => self.last_activity = self.last_activity.max(last_input),
        }
    }

    fn watch_forgotten(
        &mut self,
        config: MonitorConfig,
        elapsed: f64,
        events: &mut Vec<MonitorEvent>,
    ) {
        let Some(hours) = config.forgotten_hours.filter(|hours| *hours > 0) else {
            return;
        };
        let periods = whole(elapsed / (f64::from(hours) * 3600.0));
        if periods > self.forgotten_sent {
            self.forgotten_sent = periods;
            events.push(MonitorEvent::Forgotten {
                hours: periods * hours,
                last_activity: self.last_activity,
            });
        }
    }

    /// Returns true when it stopped the timer.
    fn watch_auto_stop(
        &mut self,
        config: MonitorConfig,
        tick: Tick,
        start: f64,
        slept: bool,
        events: &mut Vec<MonitorEvent>,
    ) -> bool {
        let Some(minute) = config.auto_stop_minute else {
            return false;
        };
        let local = tick.now + tick.utc_offset;
        let today = (local / DAY).floor() * DAY + f64::from(minute) * 60.0 - tick.utc_offset;
        // The latest auto-stop time that has passed: today's, or yesterday's before it.
        let due = if today <= tick.now {
            today
        } else {
            today - DAY
        };
        let away = tick.idle >= AUTO_STOP_IDLE || (slept && self.last_activity < due);
        if start < due && self.auto_stopped_at != Some(due) && away {
            self.auto_stopped_at = Some(due);
            events.push(MonitorEvent::AutoStop {
                at: self.last_activity.max(start),
            });
            return true;
        }
        false
    }
}

#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "a small non-negative count of whole periods"
)]
fn whole(value: f64) -> u32 {
    value.max(0.0).floor() as u32
}

#[cfg(test)]
#[path = "monitor_tests.rs"]
mod tests;
