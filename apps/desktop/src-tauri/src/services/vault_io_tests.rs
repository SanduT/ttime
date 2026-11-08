use std::os::unix::fs::symlink;

use tempfile::TempDir;

use super::*;

/// A temp folder with `vault/` and `config/` inside, and an allow-list for both.
fn setup() -> (TempDir, PathBuf, AllowList) {
    let dir = tempfile::tempdir().unwrap();
    let base = fs::canonicalize(dir.path()).unwrap();
    fs::create_dir(base.join("vault")).unwrap();
    let allow = AllowList::new([base.join("vault"), base.join("config")]);
    (dir, base, allow)
}

fn s(path: &Path) -> String {
    path.display().to_string()
}

#[test]
fn paths_inside_the_roots_are_allowed_even_if_missing() {
    let (_dir, base, allow) = setup();
    let deep = base.join("vault/entries/2026/11/2026-11-08.json");
    assert_eq!(allow.check(&s(&deep)).unwrap(), deep);
    assert_eq!(
        allow.check(&s(&base.join("vault"))).unwrap(),
        base.join("vault")
    );
    let lock = base.join("config/locks/abc.lock");
    assert_eq!(allow.check(&s(&lock)).unwrap(), lock);
}

#[test]
fn paths_outside_relative_or_with_dot_segments_are_rejected() {
    let (_dir, base, allow) = setup();
    for path in [
        s(&base.join("elsewhere.json")),
        "/etc/passwd".to_owned(),
        "vault/a.json".to_owned(),
        format!("{}/vault/../elsewhere.json", s(&base)),
        format!("{}/vault/./a.json", s(&base)),
        s(&base.join("vault-sibling/a.json")),
    ] {
        assert!(
            matches!(allow.check(&path), Err(AppError::PathNotAllowed(_))),
            "{path} should be rejected"
        );
    }
}

#[test]
fn symlinks_pointing_outside_are_rejected() {
    let (_dir, base, allow) = setup();
    fs::create_dir(base.join("outside")).unwrap();
    symlink(base.join("outside"), base.join("vault/link")).unwrap();
    symlink(base.join("outside/missing"), base.join("vault/dangling")).unwrap();
    for path in [base.join("vault/link/a.json"), base.join("vault/dangling")] {
        assert!(matches!(
            allow.check(&s(&path)),
            Err(AppError::PathNotAllowed(_))
        ));
    }
}

#[test]
fn a_symlinked_vault_root_resolves_to_its_target() {
    let (_dir, base, _allow) = setup();
    symlink(base.join("vault"), base.join("alias")).unwrap();
    let allow = AllowList::new([base.join("alias")]);
    let path = base.join("alias/ttime.json");
    assert_eq!(
        allow.check(&s(&path)).unwrap(),
        base.join("vault/ttime.json")
    );
    assert!(allow.is_root(&base.join("vault")));
}

#[test]
fn atomic_writes_replace_the_file_and_leave_no_temp_files() {
    let (_dir, base, _allow) = setup();
    let path = base.join("vault/running.json");
    assert_eq!(read_text(&path).unwrap(), None);
    write_atomic(&path, "first\n").unwrap();
    write_atomic(&path, "second\n").unwrap();
    assert_eq!(read_text(&path).unwrap().as_deref(), Some("second\n"));
    let names: Vec<String> = list(&base.join("vault"))
        .unwrap()
        .into_iter()
        .map(|e| e.name)
        .collect();
    assert_eq!(names, ["running.json"]);
}

#[test]
fn a_failed_atomic_write_reports_io_and_cleans_up() {
    let (_dir, base, _allow) = setup();
    let missing_parent = base.join("vault/nope/day.json");
    assert!(matches!(
        write_atomic(&missing_parent, "x"),
        Err(AppError::Io { .. })
    ));
    fs::create_dir(base.join("vault/dir")).unwrap();
    assert!(matches!(
        write_atomic(&base.join("vault/dir"), "x"),
        Err(AppError::Io { .. })
    ));
    let names: Vec<String> = list(&base.join("vault"))
        .unwrap()
        .into_iter()
        .map(|e| e.name)
        .collect();
    assert_eq!(names, ["dir"]);
}

#[test]
fn append_list_mkdir_remove_and_stat() {
    let (_dir, base, _allow) = setup();
    let vault = base.join("vault");
    let log = vault.join("log.jsonl");
    append_line(&log, "a").unwrap();
    append_line(&log, "b").unwrap();
    assert_eq!(read_text(&log).unwrap().as_deref(), Some("a\nb\n"));
    let meta = stat(&log).unwrap().unwrap();
    assert!((meta.size - 4.0).abs() < f64::EPSILON);
    assert!(meta.mtime_ms > 0.0);
    assert_eq!(stat(&vault.join("missing")).unwrap(), None);

    mkdirp(&vault.join("sub/deep")).unwrap();
    assert_eq!(
        list(&vault).unwrap(),
        [
            DirEntry {
                name: "log.jsonl".to_owned(),
                is_dir: false
            },
            DirEntry {
                name: "sub".to_owned(),
                is_dir: true
            },
        ]
    );
    assert_eq!(list(&vault.join("nope")).unwrap(), []);

    assert!(matches!(
        remove(&vault.join("sub"), false),
        Err(AppError::Io { .. })
    ));
    remove(&vault.join("sub"), true).unwrap();
    remove(&vault.join("never-existed"), false).unwrap();
    remove(&log, false).unwrap();
    assert_eq!(list(&vault).unwrap(), []);
}

#[test]
fn mkdir_exclusive_succeeds_once_and_needs_a_parent() {
    let (_dir, base, _allow) = setup();
    let lock = base.join("vault/x.lock");
    assert!(mkdir_exclusive(&lock).unwrap());
    assert!(!mkdir_exclusive(&lock).unwrap());
    assert!(matches!(
        mkdir_exclusive(&base.join("vault/a/b.lock")),
        Err(AppError::Io { .. })
    ));
}

#[test]
fn reading_a_folder_or_listing_a_file_is_an_io_error() {
    let (_dir, base, _allow) = setup();
    let file = base.join("vault/file");
    write_atomic(&file, "x").unwrap();
    assert!(matches!(
        read_text(&base.join("vault")),
        Err(AppError::Io { .. })
    ));
    assert!(matches!(list(&file), Err(AppError::Io { .. })));
    assert!(matches!(
        stat(&file.join("child")),
        Err(AppError::Io { .. })
    ));
}
