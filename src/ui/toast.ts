import { create } from 'zustand';

export type ToastTone = 'default' | 'success' | 'error';
export type ToastItem = { id: number; message: string; tone: ToastTone };

type ToastState = {
  items: ToastItem[];
  show: (message: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useToasts = create<ToastState>((set, get) => ({
  items: [],
  show: (message, tone = 'default') => {
    const id = nextId++;
    set({ items: [...get().items.slice(-2), { id, message, tone }] });
    window.setTimeout(() => get().dismiss(id), 3500);
  },
  dismiss: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
}));

export const toast = {
  show: (m: string) => useToasts.getState().show(m),
  success: (m: string) => useToasts.getState().show(m, 'success'),
  error: (m: string) => useToasts.getState().show(m, 'error'),
};
