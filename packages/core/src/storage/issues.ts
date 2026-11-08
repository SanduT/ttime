/** How bad a vault problem is: `error` means data was not loaded or is unreliable. */
export type IssueSeverity = 'error' | 'warning' | 'info';

/** Every kind of vault problem the reader reports. */
export type IssueCode =
  | 'vault.missing_config'
  | 'file.invalid_json'
  | 'file.invalid_schema'
  | 'file.newer_schema'
  | 'file.misnamed'
  | 'entry.future_start'
  | 'entry.unknown_project'
  | 'entry.duplicate_id'
  | 'entry.misplaced'
  | 'entry.overlap'
  | 'project.unknown_client'
  | 'running.already_stopped';

/** One problem found while loading the vault. Shown in the app banner and by `ttime doctor`. */
export type VaultIssue = {
  readonly code: IssueCode;
  readonly severity: IssueSeverity;
  /** Vault-relative file path. */
  readonly file: string;
  /** JSON path inside the file. */
  readonly path: readonly (string | number)[];
  readonly message: string;
  /** 1-based line in the file where the problem is, when the file exists. */
  readonly line?: number;
};
