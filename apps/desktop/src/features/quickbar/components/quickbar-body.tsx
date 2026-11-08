import type { Project } from '@ttime/core';
import { Command } from 'cmdk';
import type { Ref } from 'react';

import type { ActionId } from '../lib/actions';
import type { QuickItem } from '../lib/quick-items';
import { useQuickbarStore } from '../store/quickbar-store';
import { ActionPanel } from './action-panel';
import { ItemRow } from './item-row';
import { NotesList } from './notes-list';
import { ResultCard } from './result-card';
import { TodayList } from './today-list';
import { TokenInput } from './token-input';

type Props = {
  readonly items: readonly QuickItem[];
  readonly value: string;
  readonly projects: ReadonlyMap<string, Project>;
  readonly running: boolean;
  readonly inputRef: Ref<HTMLInputElement>;
  readonly onSelect: (item: QuickItem) => void;
  readonly onRun: (id: ActionId) => void;
};

type ListProps = Pick<Props, 'items' | 'projects' | 'running' | 'onSelect' | 'onRun'>;

/** What follows the rows: the last result, notes or today's entries. */
const BelowList = () => {
  const { text, panel, noteMode, result } = useQuickbarStore();
  return (
    <>
      {panel === 'done' && text === '' && result !== null ? <ResultCard result={result} /> : null}
      {panel === 'list' && noteMode ? <NotesList /> : null}
      {text === '' && !noteMode && panel !== 'actions' ? <TodayList /> : null}
    </>
  );
};

const ListContent = ({ items, projects, running, onSelect, onRun }: ListProps) => {
  const { panel, noteMode, error } = useQuickbarStore();
  const rows =
    panel === 'actions' ? (
      <ActionPanel running={running} onRun={onRun} />
    ) : (
      items.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          projects={projects}
          noteMode={noteMode}
          onSelect={onSelect}
        />
      ))
    );
  return (
    <>
      {error === null ? null : (
        <p
          role="alert"
          className="mx-1 mb-2 rounded-lg bg-(--color-control) px-3 py-2 text-sm text-(--color-danger)"
        >
          {error.message}
        </p>
      )}
      {rows}
      <BelowList />
    </>
  );
};

/** The input and what is below it: list, ⌘K actions, notes or the last result. */
export const QuickbarBody = ({
  items,
  value,
  projects,
  running,
  inputRef,
  onSelect,
  onRun,
}: Props) => {
  const { text, noteMode, setText, setSelected } = useQuickbarStore();
  const verb = noteMode ? 'Note' : running ? 'Switch' : 'Start';
  return (
    <Command
      label="Quick bar"
      shouldFilter={false}
      loop
      value={value}
      onValueChange={setSelected}
      className="flex min-h-0 flex-1 flex-col"
    >
      <TokenInput
        inputRef={inputRef}
        value={text}
        verb={verb}
        projects={projects}
        placeholder={noteMode ? 'Add a note…' : 'What are you working on?'}
        onChange={setText}
      />
      <Command.List className="min-h-0 flex-1 overflow-y-auto border-t border-(--color-border) p-2">
        <ListContent
          items={items}
          projects={projects}
          running={running}
          onSelect={onSelect}
          onRun={onRun}
        />
      </Command.List>
    </Command>
  );
};
