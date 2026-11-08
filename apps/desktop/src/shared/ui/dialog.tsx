import { type ReactNode, useEffect, useRef } from 'react';

type Props = {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  /** Wider dialog for forms with several controls per row. */
  readonly wide?: boolean;
};

/** A modal dialog (native `<dialog>`): Esc and the backdrop close it. */
export const Dialog = ({ title, onClose, children, wide = false }: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      className={`m-auto ${wide ? 'w-[540px]' : 'w-[420px]'} rounded-xl border border-(--color-border) bg-(--color-surface-solid) p-0 text-(--color-text) shadow-xl backdrop:bg-black/30`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="flex flex-col gap-4 p-5">
        <h2 className="text-base font-semibold">{title}</h2>
        {children}
      </div>
    </dialog>
  );
};
