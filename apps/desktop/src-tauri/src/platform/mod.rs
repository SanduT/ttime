//! Native platform code. All `unsafe`, including what native macros generate, lives here.

#[cfg(target_os = "macos")]
pub mod macos;
