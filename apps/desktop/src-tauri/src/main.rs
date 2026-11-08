// Prevents an extra console window on Windows release builds (Phase 3).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() -> Result<(), ttime_lib::AppError> {
    ttime_lib::run()
}
