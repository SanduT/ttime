//! Which screen the cursor is on, in logical points. Tauri's `monitor_from_point` and
//! `cursor_position` disagree on macOS with mixed Retina scales (the cursor comes scaled by the
//! main screen, the lookup compares against bounds in points), so a point on a secondary screen
//! often matches no screen and windows fell back to the main one. This module does the lookup in
//! points.

use tauri::{AppHandle, Monitor};

use crate::AppError;
use crate::services::panels::Area;

/// A screen in logical points, with its scale.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Screen {
    pub frame: Area,
    /// The frame without the menu bar and the Dock.
    pub work_area: Area,
    pub scale: f64,
}

fn area(position: (f64, f64), size: (f64, f64), scale: f64) -> Area {
    Area {
        x: position.0 / scale,
        y: position.1 / scale,
        width: size.0 / scale,
        height: size.1 / scale,
    }
}

/// Tauri reports every screen value as points times that screen's own scale.
fn screen_of(monitor: &Monitor) -> Screen {
    let scale = monitor.scale_factor();
    let (position, size) = (monitor.position(), monitor.size());
    let work = monitor.work_area();
    Screen {
        frame: area(
            (f64::from(position.x), f64::from(position.y)),
            (f64::from(size.width), f64::from(size.height)),
            scale,
        ),
        work_area: area(
            (f64::from(work.position.x), f64::from(work.position.y)),
            (f64::from(work.size.width), f64::from(work.size.height)),
            scale,
        ),
        scale,
    }
}

/// The screen containing `point`, else the main screen (origin 0, 0), else the first.
#[must_use]
pub fn screen_at(screens: &[Screen], point: (f64, f64)) -> Option<Screen> {
    let (x, y) = point;
    let contains = |s: &&Screen| {
        x >= s.frame.x
            && x < s.frame.x + s.frame.width
            && y >= s.frame.y
            && y < s.frame.y + s.frame.height
    };
    let main = |s: &&Screen| s.frame.x == 0.0 && s.frame.y == 0.0;
    screens
        .iter()
        .find(contains)
        .or_else(|| screens.iter().find(main))
        .or_else(|| screens.first())
        .copied()
}

/// The screen under the mouse pointer.
pub fn under_cursor(app: &AppHandle) -> Result<Option<Screen>, AppError> {
    let cursor = app.cursor_position()?;
    // Tauri scales the cursor by the main screen; undo that to get points.
    let main_scale = app
        .primary_monitor()?
        .map_or(1.0, |monitor| monitor.scale_factor());
    let screens: Vec<Screen> = app.available_monitors()?.iter().map(screen_of).collect();
    Ok(screen_at(
        &screens,
        (cursor.x / main_scale, cursor.y / main_scale),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn screen(x: f64, y: f64, width: f64, height: f64, scale: f64) -> Screen {
        let frame = Area {
            x,
            y,
            width,
            height,
        };
        Screen {
            frame,
            work_area: frame,
            scale,
        }
    }

    #[test]
    fn finds_the_screen_containing_the_point_across_mixed_scales() {
        let laptop = screen(0.0, 0.0, 1512.0, 982.0, 2.0);
        let external = screen(1512.0, -200.0, 2560.0, 1440.0, 1.0);
        let above = screen(0.0, -1080.0, 1920.0, 1080.0, 1.0);
        let screens = [laptop, external, above];
        assert_eq!(screen_at(&screens, (2000.0, 300.0)), Some(external));
        assert_eq!(screen_at(&screens, (100.0, -500.0)), Some(above));
        assert_eq!(screen_at(&screens, (100.0, 100.0)), Some(laptop));
    }

    #[test]
    fn falls_back_to_the_main_screen() {
        let external = screen(-2560.0, 0.0, 2560.0, 1440.0, 1.0);
        let laptop = screen(0.0, 0.0, 1512.0, 982.0, 2.0);
        assert_eq!(
            screen_at(&[external, laptop], (9999.0, 9999.0)),
            Some(laptop)
        );
        assert_eq!(screen_at(&[], (0.0, 0.0)), None);
    }
}
