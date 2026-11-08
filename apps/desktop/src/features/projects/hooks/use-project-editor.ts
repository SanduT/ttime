import { DEFAULT_SETTINGS, parseAmount, type Project, PROJECT_COLORS } from '@ttime/core';
import { useState } from 'react';

import { useVaultAction } from '../../../shared/hooks/use-vault-action';
import { useVaultStore } from '../../../shared/store/vault-store';
import { useProjectsStore } from '../store/projects-store';

/** What the project editor edits, as typed. */
export type ProjectDraft = {
  readonly name: string;
  readonly client: string;
  readonly color: string;
  readonly billable: boolean;
  readonly rate: string;
  readonly currency: string;
  readonly billingPeriod: Project['billingPeriod'];
};

const draftOf = (project: Project | undefined, currency: string): ProjectDraft =>
  project === undefined
    ? {
        name: '',
        client: '',
        color: PROJECT_COLORS[0],
        billable: true,
        rate: '',
        currency,
        billingPeriod: 'monthly',
      }
    : {
        name: project.name,
        client: project.client ?? '',
        color: project.color,
        billable: project.billable,
        rate: project.rate?.amount ?? '',
        currency: project.rate?.currency ?? currency,
        billingPeriod: project.billingPeriod,
      };

/** The fields shared by create and update; `null` removes client or rate. */
const fieldsOf = (draft: ProjectDraft) => ({
  name: draft.name,
  color: draft.color,
  billable: draft.billable,
  billingPeriod: draft.billingPeriod,
  client: draft.client === '' ? null : draft.client,
  rate:
    draft.rate.trim() === ''
      ? null
      : { amount: parseAmount(draft.rate), currency: draft.currency.trim().toUpperCase() },
});

/** State and actions of the project editor for project `id` (null: a new project). */
export const useProjectEditor = (id: string | null) => {
  const snapshot = useVaultStore((state) => state.snapshot);
  const project = id === null ? undefined : snapshot?.projects.get(id);
  const currency = snapshot?.config?.settings.defaultCurrency ?? DEFAULT_SETTINGS.defaultCurrency;
  const [draft, setDraft] = useState(() => draftOf(project, currency));
  const edit = useProjectsStore((state) => state.edit);
  const act = useVaultAction();
  const close = () => {
    edit(null);
  };
  const closeIfDone = (result: unknown) => {
    if (result !== undefined) {
      close();
    }
  };
  const save = async () => {
    closeIfDone(
      await act('Save project', async ({ projects }) => {
        const { client, rate, ...rest } = fieldsOf(draft);
        if (project !== undefined) {
          return projects.update(project.id, { ...rest, client, rate });
        }
        const optional = {
          ...(client === null ? {} : { client }),
          ...(rate === null ? {} : { rate }),
        };
        return projects.create({ ...rest, ...optional });
      }),
    );
  };
  const toggleArchive = async () => {
    if (project !== undefined) {
      closeIfDone(
        await act('Archive project', ({ projects }) =>
          project.status === 'active'
            ? projects.archive(project.id)
            : projects.unarchive(project.id),
        ),
      );
    }
  };
  const clients = [...(snapshot?.clients.values() ?? [])].filter(
    (client) => !client.archived || client.id === draft.client,
  );
  const set = (patch: Partial<ProjectDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };
  return { project, draft, set, save, toggleArchive, close, clients };
};
