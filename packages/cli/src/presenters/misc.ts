import { table } from './format';

type Project = {
  readonly id: string;
  readonly name: string;
  readonly client: string | null;
  readonly rate: string | null;
  readonly billable: boolean;
  readonly status: string;
};

const projectRow = (project: Project): string[] => [
  project.id,
  project.name,
  project.client ?? '',
  project.rate ?? '',
  project.billable ? 'billable' : '',
  project.status === 'active' ? '' : project.status,
];

/** Projects as a table. */
export const presentProjects = (result: { readonly projects: readonly Project[] }): string =>
  result.projects.length === 0
    ? 'No projects.'
    : table([['ID', 'Name', 'Client', 'Rate', '', ''], ...result.projects.map(projectRow)]);

/** One project. */
export const presentProject = (result: { readonly project: Project }): string =>
  table([projectRow(result.project)]);

/** What undo reverted. */
export const presentUndo = (result: {
  readonly undone: string;
  readonly batch: string;
  readonly changes: number;
}): string =>
  `Undid ${String(result.changes)} change${result.changes === 1 ? '' : 's'} (batch ${result.undone}). Undo this with: ttime undo --batch ${result.batch}`;

type Issue = {
  readonly severity: string;
  readonly file: string;
  readonly line: number | null;
  readonly message: string;
};

/** Vault problems, or a clean bill of health. */
export const presentDoctor = (result: {
  readonly root: string;
  readonly issues: readonly Issue[];
}): string =>
  result.issues.length === 0
    ? `${result.root}: no problems found.`
    : [
        `${result.root}: ${String(result.issues.length)} problem${result.issues.length === 1 ? '' : 's'}`,
        ...result.issues.map(
          (issue) =>
            `  ${issue.severity}  ${issue.file}${issue.line === null ? '' : `:${String(issue.line)}`}  ${issue.message}`,
        ),
      ].join('\n');

type Change = { readonly op: string; readonly kind: string; readonly id: string };

/** What a dry run would have written. */
export const presentDryRun = (changes: readonly Change[]): string =>
  changes.length === 0
    ? 'Dry run: nothing would change.'
    : `Dry run, nothing was written. It would:\n${changes.map((change) => `  ${change.op} ${change.kind} ${change.id}`).join('\n')}`;
