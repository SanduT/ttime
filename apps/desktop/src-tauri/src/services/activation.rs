//! macOS activation policy: `Accessory` (no Dock icon) by default, `Regular` while the
//! main window is open.

use tauri::AppHandle;

#[cfg(target_os = "macos")]
fn set_policy(app: &AppHandle, policy: tauri::ActivationPolicy) {
    if let Err(err) = app.set_activation_policy(policy) {
        log::error!("Could not change the activation policy: {err}");
    }
}

/// Hides the Dock icon. The app lives in the menu bar.
pub fn set_accessory(app: &AppHandle) {
    #[cfg(target_os = "macos")]
    set_policy(app, tauri::ActivationPolicy::Accessory);
    #[cfg(not(target_os = "macos"))]
    let _ = app;
}

/// Shows the Dock icon and app menu while the main window is open.
pub fn set_regular(app: &AppHandle) {
    #[cfg(target_os = "macos")]
    set_policy(app, tauri::ActivationPolicy::Regular);
    #[cfg(not(target_os = "macos"))]
    let _ = app;
}
