import { create } from 'zustand';
import { clearToken, getToken, setToken, setUnauthorizedHandler } from '@/api/http';
import { getUserInfo, logout as apiLogout, type UserInfoVO } from '@/api/auth';
import { maskSensitiveText, secureStorage } from '@/utils/secureStorage';

const USER_STORAGE_KEY = 'aster_user';

function sanitizeUserInfo(info: UserInfoVO): UserInfoVO {
  return {
    ...info,
    phone: info.phone ? maskSensitiveText(info.phone) : info.phone,
    email: info.email ? maskSensitiveText(info.email) : info.email,
  };
}

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
  token: getToken(),
  user: (() => {
    try {
      const u = secureStorage.getItem(USER_STORAGE_KEY);
      return u ? sanitizeUserInfo(JSON.parse(u) as UserInfoVO) : null;
    } catch {
      return null;
    }
  })(),
  loading: false,

  clearAuthLocal: () => {
    clearToken();
    secureStorage.removeItem(USER_STORAGE_KEY);
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
      const sanitized = info ? sanitizeUserInfo(info) : null;
      if (sanitized) {
        secureStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sanitized));
      }
      set({ user: sanitized });
    } catch {
      get().clearAuthLocal();
    } finally {
      set({ loading: false });
    }
  },
}));

setUnauthorizedHandler(() => useUserStore.getState().clearAuthLocal());
