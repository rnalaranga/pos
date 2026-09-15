import { create } from 'zustand';
import api from '../api/axios';

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
  modules?: string[];
}

interface Shift {
  id: number;
  opening_balance: number;
  opening_time: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  shift: Shift | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  fetchCurrentShift: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  shift: null,
  isLoading: true,
  login: (token, user) => {
    localStorage.setItem('token', token);
    set({ token, user, isLoading: false });
    get().fetchCurrentShift();
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null, shift: null, isLoading: false });
  },
  fetchCurrentShift: async () => {
    try {
      const response = await api.get('/shifts/current');
      set({ shift: response.data || null });
    } catch (error) {
      console.error('Failed to fetch shift');
    }
  },
  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false });
      return;
    }
    
    try {
      const response = await api.get('/auth/me');
      set({ user: response.data, isLoading: false });
      await get().fetchCurrentShift();
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      set({ token: null, user: null, isLoading: false });
    }
  }
}));
