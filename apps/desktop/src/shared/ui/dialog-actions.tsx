import type { ReactNode } from 'react';

import { Button } from './button';

type Props = { readonly onCancel: () => void; readonly extra?: ReactNode };

/** Save (submits the form), Cancel, and optional extra buttons on the right. */
export const DialogActions = ({ onCancel, extra }: Props) => (
  <div className="flex gap-2 pt-2">
    <Button type="submit" variant="primary">
      Save
    </Button>
    <Button onClick={onCancel}>Cancel</Button>
    <span className="flex-1" />
    {extra}
  </div>
);
