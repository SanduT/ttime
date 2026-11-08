//! Pure pieces of the menu bar item: the title text, when it next changes, and the colored dot.

use std::time::Duration;

use serde::{Deserialize, Serialize};

/// What the menu bar shows while tracking, pushed by the agent webview with `set_running`.
/// Rust never reads vault files for this.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RunningSummary {
    /// Start of the running entry, in seconds since the Unix epoch.
    pub start_epoch_seconds: f64,
    pub project_name: String,
    /// `#RRGGBB`.
    pub color: String,
}

/// Seconds in a minute.
const MINUTE: u64 = 60;
/// How long the ticker sleeps while nothing runs (it also wakes on every change).
pub const IDLE_WAIT: Duration = Duration::from_hours(1);
/// Size in pixels of the dot icon (18 points at 2x).
pub const DOT_SIZE: u32 = 36;
/// Gray for a missing or malformed color.
const FALLBACK_RGB: [u8; 3] = [0x8E, 0x8E, 0x93];

/// Whole seconds from `start` to `now`, never negative.
#[must_use]
#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "a non-negative whole number of seconds, far below u64::MAX"
)]
pub fn elapsed_seconds(start: f64, now: f64) -> u64 {
    (now - start).max(0.0).floor() as u64
}

/// `h:mm` for `seconds`.
#[must_use]
pub fn format_elapsed(seconds: u64) -> String {
    format!("{}:{:02}", seconds / 3600, (seconds % 3600) / MINUTE)
}

/// The elapsed `h:mm` title for the running entry, or `None` (no title) when idle.
#[must_use]
pub fn title(summary: Option<&RunningSummary>, now: f64) -> Option<String> {
    summary.map(|running| format_elapsed(elapsed_seconds(running.start_epoch_seconds, now)))
}

/// How long until the `h:mm` title changes, for an entry running `elapsed` seconds.
#[must_use]
pub const fn next_tick(elapsed: u64) -> Duration {
    Duration::from_secs(MINUTE - elapsed % MINUTE)
}

/// `[r, g, b]` of a `#RRGGBB` color, or gray when it is malformed.
#[must_use]
pub fn parse_color(color: &str) -> [u8; 3] {
    let channel = |range: std::ops::Range<usize>| {
        color
            .get(range)
            .and_then(|hex| u8::from_str_radix(hex, 16).ok())
    };
    if color.len() != 7 || !color.starts_with('#') {
        return FALLBACK_RGB;
    }
    match (channel(1..3), channel(3..5), channel(5..7)) {
        (Some(r), Some(g), Some(b)) => [r, g, b],
        _ => FALLBACK_RGB,
    }
}

#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "coverage is clamped to 0..=1, so the result fits in a u8"
)]
fn alpha(coverage: f64) -> u8 {
    (coverage.clamp(0.0, 1.0) * 255.0).round() as u8
}

/// RGBA pixels of an anti-aliased dot in `color`, `size` pixels square.
#[must_use]
pub fn dot_rgba(color: &str, size: u32) -> Vec<u8> {
    let [r, g, b] = parse_color(color);
    let center = f64::from(size) / 2.0;
    let radius = f64::from(size) * 0.28;
    let mut pixels = Vec::with_capacity((size * size * 4) as usize);
    for y in 0..size {
        for x in 0..size {
            let dx = f64::from(x) + 0.5 - center;
            let dy = f64::from(y) + 0.5 - center;
            let coverage = radius + 0.5 - dx.hypot(dy);
            pixels.extend_from_slice(&[r, g, b, alpha(coverage)]);
        }
    }
    pixels
}

#[cfg(test)]
mod tests {
    use super::*;

    fn summary(start: f64) -> RunningSummary {
        RunningSummary {
            start_epoch_seconds: start,
            project_name: "Acme".into(),
            color: "#4F7CFF".into(),
        }
    }

    #[test]
    fn title_shows_elapsed_hours_and_minutes_while_tracking() {
        assert_eq!(
            title(Some(&summary(1000.0)), 1000.0 + 3725.0),
            Some("1:02".into())
        );
        assert_eq!(title(None, 1000.0), None);
    }

    #[test]
    fn a_start_slightly_in_the_future_shows_zero() {
        assert_eq!(elapsed_seconds(1000.0, 990.0), 0);
        assert_eq!(format_elapsed(0), "0:00");
    }

    #[test]
    fn ticks_on_the_next_minute_boundary_of_the_entry() {
        assert_eq!(next_tick(0), Duration::from_mins(1));
        assert_eq!(next_tick(125), Duration::from_secs(55));
    }

    #[test]
    fn parses_colors_and_falls_back_to_gray() {
        assert_eq!(parse_color("#4F7CFF"), [0x4F, 0x7C, 0xFF]);
        assert_eq!(parse_color("4F7CFF"), FALLBACK_RGB);
        assert_eq!(parse_color("#4F7CFG"), FALLBACK_RGB);
    }

    #[test]
    fn dot_is_opaque_in_the_middle_and_clear_in_the_corner() {
        let pixels = dot_rgba("#FF0000", DOT_SIZE);
        assert_eq!(pixels.len(), (DOT_SIZE * DOT_SIZE * 4) as usize);
        let middle = ((DOT_SIZE / 2 * DOT_SIZE + DOT_SIZE / 2) * 4) as usize;
        assert_eq!(&pixels[middle..middle + 4], &[255, 0, 0, 255]);
        assert_eq!(pixels[3], 0);
    }
}
