import { useState } from 'react';

import { useVaultAction } from '../../../shared/hooks/use-vault-action';
import { useVaultStore } from '../../../shared/store/vault-store';
import { Button } from '../../../shared/ui/button';
import { Dialog } from '../../../shared/ui/dialog';
import { DialogActions } from '../../../shared/ui/dialog-actions';
import { Field, TextInput } from '../../../shared/ui/field';
import { useProjectsStore } from '../store/projects-store';

/** Creates or edits a client: name and notes, archive and unarchive. */
export const ClientEditor = ({ id }: { readonly id: string | null }) => {
  const client = useVaultStore((state) =>
    id === null ? undefined : state.snapshot?.clients.get(id),
  );
  const [name, setName] = useState(client?.name ?? '');
  const [notes, setNotes] = useState(client?.notes ?? '');
  const close = useProjectsStore((state) => state.edit);
  const act = useVaultAction();
  const finish = (result: unknown) => {
    if (result !== undefined) {
      close(null);
    }
  };
  const save = async () => {
    finish(
      await act('Save client', ({ clients }) =>
        client === undefined
          ? clients.create({ name, notes })
          : clients.update(client.id, { name, notes }),
      ),
    );
  };
  const toggleArchive = async () => {
    if (client !== undefined) {
      finish(
        await act('Archive client', ({ clients }) =>
          client.archived ? clients.unarchive(client.id) : clients.archive(client.id),
        ),
      );
    }
  };
  return (
    <Dialog
      title={client === undefined ? 'New client' : 'Edit client'}
      onClose={() => {
        close(null);
      }}
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Field label="Name">
          {}
          <TextInput
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        </Field>
        <Field label="Notes">
          <TextInput
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
            }}
          />
        </Field>
        <DialogActions
          onCancel={() => {
            close(null);
          }}
          extra={
            client === undefined ? null : (
              <Button onClick={() => void toggleArchive()}>
                {client.archived ? 'Unarchive' : 'Archive'}
              </Button>
            )
          }
        />
      </form>
    </Dialog>
  );
};
