//! Setting up the AI tools from Settings: the bundled CLI on the PATH, the MCP server in Claude
//! Code, and the skill in `~/.claude/skills`. Each step runs only when the user clicks it.

use std::path::{Path, PathBuf};
use std::process::Command;

use serde::Serialize;

use crate::AppError;

/// The CLI inside the app bundle (`bundle.externalBin`), next to the app's own executable.
const BUNDLED_CLI: &str = "ttime-cli";
/// The skill, compiled into the app so it can be installed from any build.
const SKILL: &str = include_str!("../../../../../skills/ttime/SKILL.md");
/// Where `claude` is usually installed; GUI apps do not inherit the shell's PATH.
const CLAUDE_CANDIDATES: [&str; 5] = [
    ".local/bin/claude",
    ".claude/local/claude",
    ".bun/bin/claude",
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
];

/// The command line tool.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CliStatus {
    /// This app has the CLI inside it (false in a dev build).
    pub bundled: bool,
    /// `~/.local/bin/ttime`.
    pub link: String,
    /// Something is installed at `link`.
    pub installed: bool,
}

/// The MCP server.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct McpStatus {
    /// A CLI exists to run as the server.
    pub ready: bool,
    /// What an MCP client runs with `mcp`: the link when installed, else the bundled CLI.
    pub command: String,
    /// The `claude` executable was found.
    pub claude_found: bool,
    /// Claude Code has a `ttime` server.
    pub registered: bool,
}

/// The Claude skill.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SkillStatus {
    /// `~/.claude/skills/ttime/SKILL.md`.
    pub path: String,
    pub installed: bool,
}

/// What is set up, for the Settings section.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AiStatus {
    pub cli: CliStatus,
    pub mcp: McpStatus,
    pub skill: SkillStatus,
}

/// Paths the integration works with.
#[derive(Debug, Clone)]
pub struct AiPaths {
    pub home: PathBuf,
    /// The folder holding the app's executable.
    pub exe_dir: Option<PathBuf>,
}

impl AiPaths {
    fn cli_link(&self) -> PathBuf {
        self.home.join(".local").join("bin").join("ttime")
    }

    fn bundled_cli(&self) -> Option<PathBuf> {
        self.exe_dir
            .as_ref()
            .map(|dir| dir.join(BUNDLED_CLI))
            .filter(|path| path.is_file())
    }

    fn skill_dir(&self) -> PathBuf {
        self.home.join(".claude").join("skills").join("ttime")
    }

    fn claude(&self) -> Option<PathBuf> {
        CLAUDE_CANDIDATES
            .iter()
            .map(|candidate| {
                if candidate.starts_with('/') {
                    PathBuf::from(candidate)
                } else {
                    self.home.join(candidate)
                }
            })
            .find(|path| path.is_file())
    }

    fn mcp_command(&self) -> Option<PathBuf> {
        let link = self.cli_link();
        if link.exists() {
            Some(link)
        } else {
            self.bundled_cli()
        }
    }
}

fn shown(path: &Path) -> String {
    path.display().to_string()
}

/// Whether Claude Code knows a `ttime` MCP server.
fn mcp_registered(claude: &Path) -> bool {
    Command::new(claude)
        .args(["mcp", "get", "ttime"])
        .output()
        .is_ok_and(|output| output.status.success())
}

/// What is set up right now.
#[must_use]
pub fn status(paths: &AiPaths) -> AiStatus {
    let claude = paths.claude();
    let skill = paths.skill_dir().join("SKILL.md");
    let mcp = paths.mcp_command();
    AiStatus {
        cli: CliStatus {
            bundled: paths.bundled_cli().is_some(),
            link: shown(&paths.cli_link()),
            installed: paths.cli_link().exists(),
        },
        mcp: McpStatus {
            ready: mcp.is_some(),
            command: shown(&mcp.unwrap_or_else(|| paths.cli_link())),
            registered: claude.as_deref().is_some_and(mcp_registered),
            claude_found: claude.is_some(),
        },
        skill: SkillStatus {
            path: shown(&skill),
            installed: skill.exists(),
        },
    }
}

/// Links `~/.local/bin/ttime` to the bundled CLI. A link is replaced; a real file is left alone.
pub fn install_cli(paths: &AiPaths) -> Result<(), AppError> {
    let Some(target) = paths.bundled_cli() else {
        return Err(AppError::Integration(
            "This build has no bundled command line tool. Build the app with `bun run build:app`."
                .into(),
        ));
    };
    let link = paths.cli_link();
    if let Ok(meta) = std::fs::symlink_metadata(&link) {
        if !meta.file_type().is_symlink() {
            return Err(AppError::Integration(format!(
                "{} already exists and is not a link. Remove it, then install again.",
                shown(&link)
            )));
        }
        std::fs::remove_file(&link).map_err(|err| AppError::io("replace", &link, err))?;
    }
    if let Some(dir) = link.parent() {
        std::fs::create_dir_all(dir).map_err(|err| AppError::io("create", dir, err))?;
    }
    link_to(&target, &link)
}

#[cfg(unix)]
fn link_to(target: &Path, link: &Path) -> Result<(), AppError> {
    std::os::unix::fs::symlink(target, link).map_err(|err| AppError::io("link", link, err))
}

#[cfg(not(unix))]
fn link_to(_target: &Path, link: &Path) -> Result<(), AppError> {
    Err(AppError::Integration(format!(
        "Linking {} is only supported on macOS.",
        shown(link)
    )))
}

/// Registers the MCP server in Claude Code for every folder (`-s user`), replacing an old one.
pub fn register_claude(paths: &AiPaths) -> Result<(), AppError> {
    let claude = paths.claude().ok_or_else(|| {
        AppError::Integration("Claude Code was not found. Copy the command instead.".into())
    })?;
    let command = paths
        .mcp_command()
        .ok_or_else(|| AppError::Integration("Install the command line tool first.".into()))?;
    // A missing server makes `remove` fail; that is fine.
    let _ = Command::new(&claude)
        .args(["mcp", "remove", "-s", "user", "ttime"])
        .output();
    let output = Command::new(&claude)
        .args(["mcp", "add", "-s", "user", "ttime", "--"])
        .arg(&command)
        .arg("mcp")
        .output()
        .map_err(|err| AppError::io("run", &claude, err))?;
    if output.status.success() {
        Ok(())
    } else {
        Err(AppError::Integration(format!(
            "Claude Code could not add the server: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        )))
    }
}

/// Writes the skill to `~/.claude/skills/ttime/SKILL.md`. A linked folder (a developer setup) is
/// left alone.
pub fn install_skill(paths: &AiPaths) -> Result<(), AppError> {
    let dir = paths.skill_dir();
    if std::fs::symlink_metadata(&dir).is_ok_and(|meta| meta.file_type().is_symlink()) {
        return Ok(());
    }
    std::fs::create_dir_all(&dir).map_err(|err| AppError::io("create", &dir, err))?;
    let file = dir.join("SKILL.md");
    std::fs::write(&file, SKILL).map_err(|err| AppError::io("write", &file, err))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn paths(home: &Path, exe_dir: Option<PathBuf>) -> AiPaths {
        AiPaths {
            home: home.to_path_buf(),
            exe_dir,
        }
    }

    #[test]
    fn installs_the_cli_link_and_replaces_an_old_link() {
        let dir = tempfile::tempdir().unwrap();
        let exe = dir.path().join("app");
        std::fs::create_dir_all(&exe).unwrap();
        std::fs::write(exe.join(BUNDLED_CLI), "bin").unwrap();
        let p = paths(dir.path(), Some(exe.clone()));
        install_cli(&p).unwrap();
        install_cli(&p).unwrap();
        let link = dir.path().join(".local/bin/ttime");
        assert_eq!(std::fs::read_link(&link).unwrap(), exe.join(BUNDLED_CLI));
        assert!(status(&p).cli.installed);
    }

    #[test]
    fn never_replaces_a_real_file_and_needs_a_bundled_cli() {
        let dir = tempfile::tempdir().unwrap();
        let exe = dir.path().join("app");
        std::fs::create_dir_all(&exe).unwrap();
        assert!(install_cli(&paths(dir.path(), Some(exe.clone()))).is_err());
        std::fs::write(exe.join(BUNDLED_CLI), "bin").unwrap();
        std::fs::create_dir_all(dir.path().join(".local/bin")).unwrap();
        std::fs::write(dir.path().join(".local/bin/ttime"), "mine").unwrap();
        assert!(install_cli(&paths(dir.path(), Some(exe))).is_err());
        let kept = std::fs::read_to_string(dir.path().join(".local/bin/ttime")).unwrap();
        assert_eq!(kept, "mine");
    }

    #[test]
    fn installs_the_skill_unless_the_folder_is_a_link() {
        let dir = tempfile::tempdir().unwrap();
        let p = paths(dir.path(), None);
        install_skill(&p).unwrap();
        let skill = dir.path().join(".claude/skills/ttime/SKILL.md");
        assert!(
            std::fs::read_to_string(&skill)
                .unwrap()
                .contains("name: ttime")
        );
        assert!(status(&p).skill.installed);
    }
}
