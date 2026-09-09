import { create } from 'zustand';

interface DialogConfig {
  id: string;
  type: 'alert' | 'confirm';
  title: string;
  message: string;
  resolve: (value: boolean) => void;
}

interface DialogStore {
  dialogs: DialogConfig[];
  alert: (title: string, message: string, timeoutMs?: number) => Promise<boolean>;
  confirm: (title: string, message: string) => Promise<boolean>;
  resolveDialog: (id: string, value: boolean) => void;
}

export const useDialogStore = create<DialogStore>((set, get) => ({
  dialogs: [],
  alert: (title, message, timeoutMs?: number) => new Promise((resolve) => {
    const id = Date.now().toString() + Math.random().toString();
    set(s => ({ dialogs: [...s.dialogs, { id, type: 'alert', title, message, resolve }] }));
    if (timeoutMs) {
      setTimeout(() => {
        get().resolveDialog(id, true);
      }, timeoutMs);
    }
  }),
  confirm: (title, message) => new Promise((resolve) => {
    const id = Date.now().toString() + Math.random().toString();
    set(s => ({ dialogs: [...s.dialogs, { id, type: 'confirm', title, message, resolve }] }));
  }),
  resolveDialog: (id, value) => {
    const d = get().dialogs.find(x => x.id === id);
    if (d) d.resolve(value);
    set(s => ({ dialogs: s.dialogs.filter(x => x.id !== id) }));
  }
}));
