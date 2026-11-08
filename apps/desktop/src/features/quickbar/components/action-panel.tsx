import { Command } from 'cmdk';

import { type ActionId, ACTIONS } from '../lib/actions';

type Props = {
  readonly running: boolean;
  readonly onRun: (id: ActionId) => void;
};

const NEEDS_RUNNING: ReadonlySet<ActionId> = new Set(['stop', 'edit']);

/** The ⌘K panel: every action with its shortcut. */
export const ActionPanel = ({ running, onRun }: Props) => (
  <Command.Group heading="Actions" className="px-2 text-xs text-(--color-text-muted)">
    {ACTIONS.filter((action) => running || !NEEDS_RUNNING.has(action.id)).map((action) => (
      <Command.Item
        key={action.id}
        value={`action:${action.id}`}
        className="flex cursor-default items-center rounded-lg px-3 py-2 text-sm text-(--color-text) data-[selected=true]:bg-(--color-control)"
        onSelect={() => {
          onRun(action.id);
        }}
      >
        <span className="flex-1">{action.label}</span>
        <kbd className="font-sans text-(--color-text-muted)">{action.hint}</kbd>
      </Command.Item>
    ))}
  </Command.Group>
);
