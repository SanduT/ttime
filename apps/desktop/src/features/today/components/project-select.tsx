import { useMemo } from 'react';

import { useVaultStore } from '../../../shared/store/vault-store';
import { Select } from '../../../shared/ui/field';

type Props = {
  readonly value: string;
  readonly onChange: (project: string) => void;
  readonly label?: string;
};

/** Active projects by name, plus the current one even if it is archived. */
export const ProjectSelect = ({ value, onChange, label = 'Project' }: Props) => {
  const projects = useVaultStore((state) => state.snapshot?.projects);
  const options = useMemo(
    () =>
      [...(projects?.values() ?? [])]
        .filter((project) => project.status === 'active' || project.id === value)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [projects, value],
  );
  return (
    <Select
      aria-label={label}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    >
      {value === '' ? <option value="">Choose a project</option> : null}
      {options.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </Select>
  );
};
