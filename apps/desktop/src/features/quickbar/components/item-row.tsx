import type { Project, QuickPlan } from '@ttime/core';
import { Command } from 'cmdk';
import type { ReactNode } from 'react';

import { FALLBACK_COLOR } from '../../../shared/lib/display';
import { ProjectDot } from '../../../shared/ui/project-dot';
import type { QuickItem } from '../lib/quick-items';

type Props = {
  readonly item: QuickItem;
  readonly projects: ReadonlyMap<string, Project>;
  readonly noteMode: boolean;
  readonly onSelect: (item: QuickItem) => void;
};

const ROW =
  'flex h-10 cursor-default items-center gap-3 rounded-[10px] px-3 text-sm transition-colors duration-100 data-[selected=true]:bg-(--color-accent-tint) data-[selected=true]:font-medium';

const startHint = (plan: QuickPlan): string | null => {
  const { start } = plan.input;
  switch (start.kind) {
    case 'now':
      return null;
    case 'offset':
      return `${String(Math.round(start.seconds / 60))} min ago`;
    case 'clock':
      return `at ${String(start.hour)}:${String(start.minute).padStart(2, '0')}`;
  }
};

const ProjectLabel = ({ plan }: { readonly plan: QuickPlan }) => {
  if (plan.project === null) {
    return <span className="text-(--color-text-muted)">Add @project to choose a project</span>;
  }
  if (plan.project.kind === 'new') {
    return <span className="text-(--color-text-muted)">new project “{plan.project.name}”</span>;
  }
  return (
    <span className="flex items-center gap-1.5 text-(--color-text-muted)">
      <ProjectDot color={plan.project.project.color} />
      {plan.project.project.name}
    </span>
  );
};

const StartContent = ({
  plan,
  noteMode,
}: {
  readonly plan: QuickPlan;
  readonly noteMode: boolean;
}) => {
  const verb = noteMode ? 'Add note' : plan.running === null ? 'Start' : 'Switch to';
  const label = noteMode ? plan.text : plan.input.description;
  return (
    <>
      <span className="font-medium">{verb}</span>
      <span className="min-w-0 flex-1 truncate">{label === '' ? '(no description)' : label}</span>
      <span className="text-xs text-(--color-text-muted)">{startHint(plan)}</span>
      <ProjectLabel plan={plan} />
    </>
  );
};

const content = (item: QuickItem, projects: ReadonlyMap<string, Project>, noteMode: boolean) => {
  switch (item.kind) {
    case 'start':
      return <StartContent plan={item.plan} noteMode={noteMode} />;
    case 'trim':
      return row(null, 'Trim the earlier entry and start anyway', '↵');
    case 'project':
      return row(
        <ProjectDot color={item.project.color} />,
        item.project.name,
        `@${item.project.id}`,
      );
    case 'create-project':
      return row(null, `Create project “${item.name}”`, null);
    case 'recent': {
      const project = projects.get(item.item.project);
      return row(
        <ProjectDot color={project?.color ?? FALLBACK_COLOR} />,
        item.item.description === '' ? '(no description)' : item.item.description,
        project?.name ?? item.item.project,
      );
    }
  }
};

const row = (icon: ReactNode, label: string, detail: string | null) => (
  <>
    {icon}
    <span className="min-w-0 flex-1 truncate">{label}</span>
    <span className="text-(--color-text-muted)">{detail}</span>
  </>
);

/** One list row: start, project completion, create project or recent entry. */
export const ItemRow = ({ item, projects, noteMode, onSelect }: Props) => (
  <Command.Item
    value={item.id}
    className={ROW}
    onSelect={() => {
      onSelect(item);
    }}
  >
    {content(item, projects, noteMode)}
  </Command.Item>
);
