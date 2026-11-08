import { useEffect, useState } from 'react';

import { Button } from '../../../shared/ui/button';
import { acceleratorOf, displayOf } from '../lib/accelerator';

type Props = {
  readonly value: string;
  readonly onChange: (accelerator: string) => void;
};

/** Click, then press a key combination; Esc cancels. */
export const ShortcutRecorder = ({ value, onChange }: Props) => {
  const [recording, setRecording] = useState(false);
  useEffect(() => {
    if (!recording) {
      return;
    }
    const onKey = (event: KeyboardEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      if (event.code === 'Escape') {
        setRecording(false);
        return;
      }
      const accelerator = acceleratorOf(event);
      if (accelerator !== null) {
        setRecording(false);
        onChange(accelerator);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
    };
  }, [recording, onChange]);
  return (
    <Button
      aria-label="Quick bar shortcut"
      variant={recording ? 'primary' : 'secondary'}
      onClick={() => {
        setRecording((current) => !current);
      }}
    >
      {recording ? 'Press a shortcut… (Esc cancels)' : displayOf(value)}
    </Button>
  );
};
