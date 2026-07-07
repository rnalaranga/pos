import { create } from 'zustand';
import api from '../api/axios';

interface SettingsState {
  settings: Record<string, string>;
  currencySymbol: string;
  fetchSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {},
  currencySymbol: '$', // default
  fetchSettings: async () => {
    try {
      const res = await api.get('/settings');
      const data = res.data;
      set({ 
        settings: data,
        currencySymbol: data.currency_symbol || '$' 
      });
    } catch (e) {
      console.error('Failed to load settings');
    }
  },
  updateSetting: (key, value) => set((state) => ({
    settings: { ...state.settings, [key]: value },
    ...(key === 'currency_symbol' ? { currencySymbol: value } : {})
  })),
}));
