import { useState } from 'react';

import { TextInput } from '../../../shared/ui/field';

type Props = {
  readonly value: string;
  readonly className?: string;
  readonly label: string;
  readonly onCommit: (value: string) => void;
};

/** A text field that saves when it loses focus or on Enter, not on every key. */
export const CommitInput = ({ value, className = '', label, onCommit }: Props) => {
  const [text, setText] = useState(value);
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    // The saved value changed (saved here, undone, or edited elsewhere): show it.
    setShown(value);
    setText(value);
  }
  return (
    <TextInput
      aria-label={label}
      className={className}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
      }}
      onBlur={() => {
        if (text.trim() !== value) {
          onCommit(text.trim());
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
      }}
    />
  );
};
