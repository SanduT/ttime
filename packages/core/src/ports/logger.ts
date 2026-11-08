/** Structured context attached to a log line. Descriptions, notes and client names belong at `debug` only. */
export type LogContext = Readonly<Record<string, unknown>>;

/** The one logging port. Desktop forwards to tauri-plugin-log, the CLI writes JSON lines to stderr. */
export type Logger = {
  readonly debug: (message: string, context?: LogContext) => void;
  readonly info: (message: string, context?: LogContext) => void;
  readonly warn: (message: string, context?: LogContext) => void;
  readonly error: (message: string, context?: LogContext) => void;
};
