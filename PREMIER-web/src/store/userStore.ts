import { create } from 'zustand';
import { clearToken, setToken, setUnauthorizedHandler } from '@/api/http';
import { getUserInfo, logout as apiLogout, type UserInfoVO } from '@/api/auth';

interface UserState {
  token: string;
  user: UserInfoVO | null;
  loading: boolean;
  clearAuthLocal: () => void;
  loginSuccess: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  token: localStorage.getItem('aster_token') || '',
  user: (() => {
    try {
      const u = localStorage.getItem('aster_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })(),
  loading: false,

  clearAuthLocal: () => {
    clearToken();
    localStorage.removeItem('aster_user');
    set({ token: '', user: null, loading: false });
  },

  loginSuccess: async (token) => {
    setToken(token);
    set({ token });
    await get().refresh();
  },

  logout: async () => {
    try {
      await apiLogout();
    } catch {
      // ignore
    }
    get().clearAuthLocal();
  },

  refresh: async () => {
    if (!get().token) {
      set({ user: null });
      return;
    }
    set({ loading: true });
    try {
      const info = await getUserInfo();
      if (info) {
        try {
          localStorage.setItem('aster_user', JSON.stringify(info));
        } catch {
          // ignore
        }
      }
      set({ user: info });
    } catch {
      get().clearAuthLocal();
    } finally {
      set({ loading: false });
    }
  },
}));

setUnauthorizedHandler(() => useUserStore.getState().clearAuthLocal());
