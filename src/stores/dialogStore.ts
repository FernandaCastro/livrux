import { create } from 'zustand';

export interface DialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface DialogStore {
  dialog: DialogOptions | null;
  show: (options: DialogOptions) => void;
  hide: () => void;
}

export const useDialogStore = create<DialogStore>((set) => ({
  dialog: null,
  show: (options) => set({ dialog: options }),
  hide: () => set({ dialog: null }),
}));
