import { create } from 'zustand';

/** One message shown to the user. */
type Toast = { readonly id: number; readonly message: string };

type ToastState = {
  readonly toasts: readonly Toast[];
  readonly push: (message: string) => void;
  readonly dismiss: (id: number) => void;
};

let nextId = 1;

/** Messages from `runAction`, shown by the window's toaster. */
export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: (message) => {
    const toast = { id: nextId, message };
    nextId += 1;
    set((state) => ({ toasts: [...state.toasts, toast] }));
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
}));
