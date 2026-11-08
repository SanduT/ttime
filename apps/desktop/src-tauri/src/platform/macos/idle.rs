//! System idle time and the local UTC offset, through CoreGraphics and libc.
#![expect(unsafe_code, reason = "C calls into CoreGraphics and libc")]

/// `kCGEventSourceStateCombinedSessionState`.
const COMBINED_SESSION_STATE: i32 = 0;
/// `kCGAnyInputEventType`.
const ANY_INPUT_EVENT: u32 = u32::MAX;

#[link(name = "CoreGraphics", kind = "framework")]
unsafe extern "C" {
    fn CGEventSourceSecondsSinceLastEventType(state: i32, event_type: u32) -> f64;
}

/// Seconds since the last keyboard, mouse or trackpad input in this login session.
#[must_use]
pub fn seconds_since_input() -> f64 {
    // SAFETY: a pure query with constant arguments; it reads no memory of ours.
    unsafe { CGEventSourceSecondsSinceLastEventType(COMBINED_SESSION_STATE, ANY_INPUT_EVENT) }
}

/// Local time minus UTC, in seconds, at `epoch_seconds` (follows daylight saving time).
#[must_use]
pub fn utc_offset(epoch_seconds: i64) -> i64 {
    let time: libc::time_t = epoch_seconds;
    // SAFETY: `tm` is plain data, fully written by `localtime_r` before it is read; both
    // pointers are valid for the call and `localtime_r` keeps neither.
    let mut tm: libc::tm = unsafe { std::mem::zeroed() };
    // SAFETY: as above.
    let result = unsafe { libc::localtime_r(&raw const time, &raw mut tm) };
    if result.is_null() { 0 } else { tm.tm_gmtoff }
}
