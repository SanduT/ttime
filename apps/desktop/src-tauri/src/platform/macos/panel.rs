//! The quick bar and popover as `NSPanel`s: becomes key without activating the app, floats above other
//! windows and joins every Space, including full-screen ones. Focus therefore stays with the
//! previous app's process, and hiding the panel hands the keyboard straight back to it.
#![expect(
    clippy::unused_unit,
    reason = "the panel_event! grammar requires an explicit `-> ()` return type"
)]

use tauri::{AppHandle, WebviewWindow};
use tauri_nspanel::{
    CollectionBehavior, ManagerExt, PanelLevel, StyleMask, WebviewWindowExt, tauri_panel,
};

use crate::AppError;

tauri_panel! {
    panel!(FloatingPanel {
        config: {
            can_become_key_window: true,
            is_floating_panel: true
        }
    })

    panel_event!(FloatingPanelEvents {
        window_did_resign_key(notification: &NSNotification) -> ()
    })
}

fn panel_error(err: impl std::fmt::Debug) -> AppError {
    AppError::Panel(format!("{err:?}"))
}

/// Turns `window` into a floating panel. `on_resign_key` runs when it loses focus.
pub fn convert(window: &WebviewWindow, on_resign_key: impl Fn() + 'static) -> Result<(), AppError> {
    let panel = window.to_panel::<FloatingPanel>()?;
    panel.set_level(PanelLevel::Floating.value());
    panel
        .set_style_mask(StyleMask::empty().nonactivating_panel().into())
        .map_err(panel_error)?;
    panel.set_collection_behavior(
        CollectionBehavior::new()
            .can_join_all_spaces()
            .full_screen_auxiliary()
            .into(),
    );
    let events = FloatingPanelEvents::new();
    events.window_did_resign_key(move |_| on_resign_key());
    panel.set_event_handler(Some(events.as_ref()));
    Ok(())
}

/// Shows the panel `label` and gives it keyboard focus. Main thread only.
pub fn show(app: &AppHandle, label: &str) -> Result<(), AppError> {
    app.get_webview_panel(label)
        .map_err(panel_error)?
        .show_and_make_key();
    Ok(())
}

/// Hides the panel `label`. Main thread only.
pub fn hide(app: &AppHandle, label: &str) -> Result<(), AppError> {
    app.get_webview_panel(label).map_err(panel_error)?.hide();
    Ok(())
}
