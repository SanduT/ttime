/** Platform facts core needs. */
export type EnvPort = {
  readonly platform: 'macos' | 'windows' | 'linux';
  readonly homeDir: string;
  /** `~/.config/ttime` on macOS and Linux, `%APPDATA%\ttime` on Windows. Holds config and locks. */
  readonly configDir: string;
  /** Process ID, recorded in lock owner files for diagnostics. */
  readonly pid: number;
};
