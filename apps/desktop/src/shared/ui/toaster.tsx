import { AnimatePresence, motion } from 'motion/react';

import { useToastStore } from '../store/toast-store';

/** Shows `runAction` messages at the bottom of the window; they slide in and out. */
export const Toaster = () => {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  return (
    <ol
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 flex flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.li
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 520, damping: 38 }}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-(--color-border) bg-(--color-surface-solid) p-3 text-sm shadow-(--shadow-pop)"
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
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
};
