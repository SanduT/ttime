import {
  type AiStatus,
  type CliStatus,
  commands,
  type McpStatus,
  type SkillStatus,
} from './bindings';
import { unwrap } from './ipc';

export type { AiStatus, CliStatus, McpStatus, SkillStatus };

/** Settings > AI: each call does one setup step and returns the new status. */
export type AiApi = {
  readonly status: () => Promise<AiStatus>;
  readonly installCli: () => Promise<AiStatus>;
  readonly registerClaude: () => Promise<AiStatus>;
  readonly installSkill: () => Promise<AiStatus>;
};

export const aiApi: AiApi = {
  status: () => unwrap(commands.aiStatus()),
  installCli: () => unwrap(commands.aiInstallCli()),
  registerClaude: () => unwrap(commands.aiRegisterClaude()),
  installSkill: () => unwrap(commands.aiInstallSkill()),
};
