//! Settings > AI: the CLI, the Claude Code MCP server and the skill.

use tauri::{AppHandle, Manager};

use crate::AppError;
use crate::services::ai::{self, AiPaths, AiStatus};

fn paths(app: &AppHandle) -> Result<AiPaths, AppError> {
    Ok(AiPaths {
        home: app.path().home_dir()?,
        exe_dir: std::env::current_exe()
            .ok()
            .and_then(|exe| exe.parent().map(std::path::Path::to_path_buf)),
    })
}

/// What is set up: the CLI link, the MCP server in Claude Code and the skill.
#[tauri::command]
#[specta::specta]
pub async fn ai_status(app: AppHandle) -> Result<AiStatus, AppError> {
    Ok(ai::status(&paths(&app)?))
}

/// Links `~/.local/bin/ttime` to the CLI inside the app.
#[tauri::command]
#[specta::specta]
pub async fn ai_install_cli(app: AppHandle) -> Result<AiStatus, AppError> {
    let paths = paths(&app)?;
    ai::install_cli(&paths)?;
    Ok(ai::status(&paths))
}

/// Adds the ttime MCP server to Claude Code for every folder.
#[tauri::command]
#[specta::specta]
pub async fn ai_register_claude(app: AppHandle) -> Result<AiStatus, AppError> {
    let paths = paths(&app)?;
    ai::register_claude(&paths)?;
    Ok(ai::status(&paths))
}

/// Writes the skill to `~/.claude/skills/ttime/SKILL.md`.
#[tauri::command]
#[specta::specta]
pub async fn ai_install_skill(app: AppHandle) -> Result<AiStatus, AppError> {
    let paths = paths(&app)?;
    ai::install_skill(&paths)?;
    Ok(ai::status(&paths))
}
