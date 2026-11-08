/** Every error code core can raise. Namespaced so the CLI, MCP server and UI report problems alike. */
export type ErrorCode =
  | 'input.invalid'
  | 'vault.missing_config'
  | 'vault.parse_failed'
  | 'vault.read_only'
  | 'vault.locked'
  | 'vault.lock_lost'
  | 'timer.already_running'
  | 'timer.not_running'
  | 'timer.invalid_start'
  | 'timer.invalid_end'
  | 'timer.backdate_overlap'
  | 'entry.not_found'
  | 'entry.invalid_range'
  | 'entry.duplicate_id'
  | 'project.not_found'
  | 'project.archived'
  | 'client.not_found'
  | 'undo.not_found'
  | 'undo.conflict'
  | 'config.parse_failed'
  | 'io.failed'
  | 'io.path_not_allowed'
  | 'platform.failed'
  | 'internal.invariant';

/** Options for {@link TTimeError}. */
export type TTimeErrorOptions = {
  readonly details?: Readonly<Record<string, unknown>>;
  readonly cause?: unknown;
};

/** The only error type core throws. `code` is stable; `message` is user-facing. */
export class TTimeError extends Error {
  readonly code: ErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: ErrorCode, message: string, options: TTimeErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'TTimeError';
    this.code = code;
    this.details = options.details ?? {};
  }
}

/** True when `value` is a {@link TTimeError}, optionally with a given code. */
export const isTTimeError = (value: unknown, code?: ErrorCode): value is TTimeError =>
  value instanceof TTimeError && (code === undefined || value.code === code);
