import { Button } from '../../../shared/ui/button';
import { Dialog } from '../../../shared/ui/dialog';
import { DialogActions } from '../../../shared/ui/dialog-actions';
import { Field, Select, TextInput } from '../../../shared/ui/field';
import { type ProjectDraft, useProjectEditor } from '../hooks/use-project-editor';
import { ColorPicker } from './color-picker';

type FieldsProps = {
  readonly draft: ProjectDraft;
  readonly onChange: (patch: Partial<ProjectDraft>) => void;
};

/** Billable, hourly rate and billing period. */
const BillingFields = ({ draft, onChange }: FieldsProps) => (
  <>
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={draft.billable}
        onChange={(event) => {
          onChange({ billable: event.target.checked });
        }}
      />
      Billable by default
    </label>
    <div className="flex gap-2">
      <Field label="Hourly rate (optional)">
        <TextInput
          placeholder="50.00"
          className="w-28"
          value={draft.rate}
          onChange={(event) => {
            onChange({ rate: event.target.value });
          }}
        />
      </Field>
      <Field label="Currency">
        <TextInput
          className="w-20 uppercase"
          maxLength={3}
          value={draft.currency}
          onChange={(event) => {
            onChange({ currency: event.target.value });
          }}
        />
      </Field>
      <Field label="Billing period">
        <Select
          value={draft.billingPeriod}
          onChange={(event) => {
            onChange({ billingPeriod: event.target.value === 'weekly' ? 'weekly' : 'monthly' });
          }}
        >
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
        </Select>
      </Field>
    </div>
  </>
);

/** Creates or edits a project: name, client, color, billing and rate. */
export const ProjectEditor = ({ id }: { readonly id: string | null }) => {
  const { project, draft, set, save, toggleArchive, close, clients } = useProjectEditor(id);
  return (
    <Dialog title={project === undefined ? 'New project' : 'Edit project'} onClose={close}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Field label="Name">
          <TextInput
            value={draft.name}
            onChange={(event) => {
              set({ name: event.target.value });
            }}
          />
        </Field>
        <Field label="Client">
          <Select
            value={draft.client}
            onChange={(event) => {
              set({ client: event.target.value });
            }}
          >
            <option value="">No client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
        </Field>
        <ColorPicker
          value={draft.color}
          onChange={(color) => {
            set({ color });
          }}
        />
        <BillingFields draft={draft} onChange={set} />
        <DialogActions
          onCancel={close}
          extra={
            project === undefined ? null : (
              <Button onClick={() => void toggleArchive()}>
                {project.status === 'active' ? 'Archive' : 'Unarchive'}
              </Button>
            )
          }
        />
      </form>
    </Dialog>
  );
};
