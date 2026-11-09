import { useState } from 'react';

import { Button } from '../../../shared/ui/button';
import { ExportDialog } from '../../export';
import { useProjectsStore } from '../store/projects-store';
import { ClientEditor } from './client-editor';
import { ProjectDetail } from './project-detail';
import { ProjectEditor } from './project-editor';
import { ProjectList } from './project-list';

/** Projects (PRD 6.3): the list grouped by client, a project's detail, and the editors. */
export const ProjectsView = () => {
  const { selected, editor, showArchived, toggleArchived, edit } = useProjectsStore();
  const [exporting, setExporting] = useState(false);
  return (
    <>
      {selected === null ? (
        <section className="flex flex-col gap-4">
          <header className="flex items-center gap-2">
            <h1 className="flex-1 text-[28px] font-bold tracking-[-0.025em]">Projects</h1>
            <label className="flex items-center gap-2 text-sm text-(--color-text-muted)">
              <input type="checkbox" checked={showArchived} onChange={toggleArchived} />
              Show archived
            </label>
            <Button
              onClick={() => {
                setExporting(true);
              }}
            >
              Export CSV
            </Button>
            <Button
              onClick={() => {
                edit({ kind: 'client', id: null });
              }}
            >
              New client
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                edit({ kind: 'project', id: null });
              }}
            >
              New project
            </Button>
          </header>
          <ProjectList />
        </section>
      ) : (
        <ProjectDetail id={selected} />
      )}
      {exporting ? (
        <ExportDialog
          project={null}
          initial={{ kind: 'this-month' }}
          onClose={() => {
            setExporting(false);
          }}
        />
      ) : null}
      {editor?.kind === 'project' ? (
        <ProjectEditor key={editor.id ?? 'new'} id={editor.id} />
      ) : null}
      {editor?.kind === 'client' ? <ClientEditor key={editor.id ?? 'new'} id={editor.id} /> : null}
    </>
  );
};
