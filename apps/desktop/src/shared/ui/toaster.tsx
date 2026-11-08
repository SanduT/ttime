import { useToastStore } from '../store/toast-store';

/** Shows `runAction` messages at the bottom of the window. */
export const Toaster = () => {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  return (
    <ol aria-live="polite" className="fixed inset-x-4 bottom-4 flex flex-col gap-2">
      {toasts.map((toast) => (
        <li
          key={toast.id}
          className="flex items-start gap-3 rounded-lg border border-(--color-border) bg-(--color-surface) p-3 text-sm shadow-lg backdrop-blur"
        >
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            className="text-(--color-text-muted) hover:text-(--color-text)"
            onClick={() => {
              dismiss(toast.id);
            }}
          >
            ×
          </button>
        </li>
      ))}
    </ol>
  );
};
