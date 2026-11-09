import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

import { copyText } from '../../../shared/adapters/clipboard';
import {
  aiApi,
  type AiStatus,
  type CliStatus,
  type McpStatus,
  type SkillStatus,
} from '../../../shared/bridge/ai-api';
import { runAction } from '../../../shared/lib/run-action';
import { useToastStore } from '../../../shared/store/toast-store';
import { Button } from '../../../shared/ui/button';
import { useAiStatus } from '../hooks/use-ai-status';
import { claudeCommand, mcpConfig } from '../lib/mcp-snippets';
import { Row, Section } from './section';

const Done = ({ children }: { readonly children: ReactNode }) => (
  <span className="flex min-w-0 items-center gap-1.5 text-sm">
    <Check size={14} className="shrink-0 text-(--color-accent)" aria-hidden />
    <span className="truncate">{children}</span>
  </span>
);

const Hint = ({ children }: { readonly children: ReactNode }) => (
  <span className="truncate text-sm text-(--color-text-muted)">{children}</span>
);

const copy = (label: string, text: string) => {
  void runAction(label, async () => {
    await copyText(text);
    useToastStore.getState().push('Copied');
  });
};

type RowProps = {
  readonly busy: boolean;
  readonly run: (label: string, step: () => Promise<AiStatus>) => Promise<void>;
};

const CliRow = ({ cli, busy, run }: RowProps & { readonly cli: CliStatus }) => (
  <Row label="Command line">
    {cli.installed ? <Done>ttime in {cli.link}</Done> : null}
    {!cli.bundled ? (
      <Hint>Available in the built app (bun run build:app).</Hint>
    ) : (
      <Button
        disabled={busy}
        onClick={() => {
          void run('Install the command line tool', aiApi.installCli);
        }}
      >
        {cli.installed ? 'Reinstall' : 'Install'}
      </Button>
    )}
  </Row>
);

const ClaudeRow = ({ mcp, busy, run }: RowProps & { readonly mcp: McpStatus }) => {
  const cli = mcp.command;
  if (mcp.registered) {
    return (
      <Row label="Claude Code">
        <Done>MCP server added</Done>
      </Row>
    );
  }
  if (!mcp.ready) {
    return (
      <Row label="Claude Code">
        <Hint>Install the command line tool first.</Hint>
      </Row>
    );
  }
  return (
    <Row label="Claude Code">
      {!mcp.claudeFound ? null : (
        <Button
          variant="primary"
          disabled={busy}
          onClick={() => {
            void run('Add to Claude Code', aiApi.registerClaude);
          }}
        >
          Add to Claude Code
        </Button>
      )}
      <Button
        onClick={() => {
          copy('Copy command', claudeCommand(cli));
        }}
      >
        Copy command
      </Button>
    </Row>
  );
};

const ClientsRow = ({ cli }: { readonly cli: string | null }) => (
  <Row label="Other MCP clients">
    <Button
      disabled={cli === null}
      onClick={() => {
        if (cli !== null) {
          copy('Copy MCP config', mcpConfig(cli));
        }
      }}
    >
      Copy MCP config
    </Button>
    <Hint>Paste into Claude Desktop, Cursor or any MCP client.</Hint>
  </Row>
);

const SkillRow = ({ skill, busy, run }: RowProps & { readonly skill: SkillStatus }) => (
  <Row label="Claude skill">
    {skill.installed ? <Done>{skill.path}</Done> : null}
    <Button
      disabled={busy}
      onClick={() => {
        void run('Install the skill', aiApi.installSkill);
      }}
    >
      {skill.installed ? 'Update' : 'Install'}
    </Button>
  </Row>
);

/** Settings > AI: the CLI on the PATH, the MCP server in Claude Code and other clients, the skill. */
export const AiSection = () => {
  const { status, busy, run } = useAiStatus();
  if (status === null) {
    return null;
  }
  const props = { busy, run };
  return (
    <Section title="AI and command line">
      <p className="text-sm text-(--color-text-muted)">
        Let Claude read and log your time: “add 2 hours yesterday on Acme”, “how many hours this
        week?”. It all runs on this Mac and works on the same vault files.
      </p>
      <CliRow cli={status.cli} {...props} />
      <ClaudeRow mcp={status.mcp} {...props} />
      <ClientsRow cli={status.mcp.ready ? status.mcp.command : null} />
      <SkillRow skill={status.skill} {...props} />
    </Section>
  );
};
