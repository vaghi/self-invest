import { create } from 'zustand';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

let nextId = 0;
let lastToastKey = '';
let lastToastTime = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const key = `${toast.type}:${toast.title}:${toast.message ?? ''}`;
    const now = Date.now();
    if (key === lastToastKey && now - lastToastTime < 2000) {
      return;
    }
    lastToastKey = key;
    lastToastTime = now;

    const id = String(++nextId);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));

    const duration = toast.duration ?? (toast.type === 'error' ? 8000 : 4000);
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

export function showError(title: string, message?: string) {
  useToastStore.getState().addToast({ type: 'error', title, message });
}

export function showSuccess(title: string, message?: string) {
  useToastStore.getState().addToast({ type: 'success', title, message });
}

export function showWarning(title: string, message?: string) {
  useToastStore.getState().addToast({ type: 'warning', title, message });
}

export function showInfo(title: string, message?: string) {
  useToastStore.getState().addToast({ type: 'info', title, message });
}
