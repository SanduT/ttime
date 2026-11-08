//! The three windows. The quick bar exists from launch, the popover from first use; both
//! hide instead of closing. The main window is created on demand and destroyed on close.

use tauri::{
    AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder, Window, WindowEvent,
    window::{Effect, EffectState, EffectsBuilder},
};

use crate::{AppError, services::activation};

/// Corner radius of the panels' vibrancy material, matching the webview's card.
const PANEL_RADIUS: f64 = 12.0;

/// A screen area in logical points.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Area {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// One of the app's windows.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WindowKind {
    Quickbar,
    Popover,
    Main,
}

impl WindowKind {
    const ALL: [Self; 3] = [Self::Quickbar, Self::Popover, Self::Main];

    /// The window label, also the capability target.
    #[must_use]
    pub const fn label(self) -> &'static str {
        match self {
            Self::Quickbar => "quickbar",
            Self::Popover => "popover",
            Self::Main => "main",
        }
    }

    const fn page(self) -> &'static str {
        match self {
            Self::Quickbar => "quickbar.html",
            Self::Popover => "popover.html",
            Self::Main => "main.html",
        }
    }

    const fn size(self) -> (f64, f64) {
        match self {
            Self::Quickbar => (680.0, 420.0),
            Self::Popover => (340.0, 460.0),
            Self::Main => (1100.0, 720.0),
        }
    }

    /// The quick bar and popover are floating panels; the main window is a normal window.
    const fn is_panel(self) -> bool {
        matches!(self, Self::Quickbar | Self::Popover)
    }

    fn from_label(label: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|kind| kind.label() == label)
    }
}

/// Creates `kind` hidden, or returns the existing window.
pub fn create(app: &AppHandle, kind: WindowKind) -> Result<WebviewWindow, AppError> {
    if let Some(window) = app.get_webview_window(kind.label()) {
        return Ok(window);
    }
    let (width, height) = kind.size();
    let builder = WebviewWindowBuilder::new(app, kind.label(), WebviewUrl::App(kind.page().into()))
        .title("ttime")
        .inner_size(width, height)
        .visible(false);
    let builder = if kind.is_panel() {
        builder
            .decorations(false)
            .transparent(true)
            .resizable(false)
            .skip_taskbar(true)
            .shadow(true)
            .effects(
                EffectsBuilder::new()
                    .effect(Effect::Popover)
                    .state(EffectState::Active)
                    .radius(PANEL_RADIUS)
                    .build(),
            )
    } else {
        builder
    };
    Ok(builder.build()?)
}

/// Shows the panel `kind` and gives it keyboard focus (main thread on macOS).
pub fn show_panel(app: &AppHandle, kind: WindowKind) -> Result<(), AppError> {
    #[cfg(target_os = "macos")]
    {
        let handle = app.clone();
        app.run_on_main_thread(move || {
            if let Err(err) = crate::platform::macos::panel::show(&handle, kind.label()) {
                log::error!("Could not show the {} panel: {err}", kind.label());
            }
        })?;
    }
    #[cfg(not(target_os = "macos"))]
    show(app, kind)?;
    Ok(())
}

/// Hides the panel `kind`; on macOS the previous app keeps keyboard focus.
pub fn hide_panel(app: &AppHandle, kind: WindowKind) -> Result<(), AppError> {
    #[cfg(target_os = "macos")]
    {
        let handle = app.clone();
        app.run_on_main_thread(move || {
            if let Err(err) = crate::platform::macos::panel::hide(&handle, kind.label()) {
                log::error!("Could not hide the {} panel: {err}", kind.label());
            }
        })?;
    }
    #[cfg(not(target_os = "macos"))]
    if let Some(window) = app.get_webview_window(kind.label()) {
        window.hide()?;
    }
    Ok(())
}

/// Shows and focuses `kind`, creating it if needed.
pub fn show(app: &AppHandle, kind: WindowKind) -> Result<(), AppError> {
    let window = create(app, kind)?;
    if kind == WindowKind::Main {
        activation::set_regular(app);
    }
    window.show()?;
    window.set_focus()?;
    Ok(())
}

/// Hides the quick bar and popover instead of closing them; restores the `Accessory`
/// policy when the main window is gone.
pub fn on_window_event(window: &Window, event: &WindowEvent) {
    match (WindowKind::from_label(window.label()), event) {
        (
            Some(WindowKind::Quickbar | WindowKind::Popover),
            WindowEvent::CloseRequested { api, .. },
        ) => {
            api.prevent_close();
            if let Err(err) = window.hide() {
                log::error!("Could not hide the {} window: {err}", window.label());
            }
        }
        (Some(WindowKind::Main), WindowEvent::Destroyed) => {
            activation::set_accessory(window.app_handle());
        }
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn labels_round_trip() {
        for kind in WindowKind::ALL {
            assert_eq!(WindowKind::from_label(kind.label()), Some(kind));
        }
        assert_eq!(WindowKind::from_label("settings"), None);
    }

    #[test]
    fn every_window_has_its_own_page() {
        assert_eq!(WindowKind::Quickbar.page(), "quickbar.html");
        assert_eq!(WindowKind::Popover.page(), "popover.html");
        assert_eq!(WindowKind::Main.page(), "main.html");
    }
}
