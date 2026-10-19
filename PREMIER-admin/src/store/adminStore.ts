import { create } from 'zustand';
import http, { TOKEN_KEY, TOKEN_NAME_KEY } from '@/api/http';
import { secureStorage } from '@/utils/secureStorage';

export interface AdminInfo {
  id: number;
  username: string;
  nickname?: string;
  avatar?: string;
  roleCode?: string;
  roleName?: string;
  permissions?: string;
}

interface State {
  token: string | null;
  admin: AdminInfo | null;
  authStatus: 'idle' | 'loading' | 'ready' | 'error';
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useAdminStore = create<State>((set, get) => ({
  token: secureStorage.getItem(TOKEN_KEY),
  admin: null,
  authStatus: secureStorage.getItem(TOKEN_KEY) ? 'idle' : 'ready',
  login: async (username, password) => {
    const vo = await http.post<any, any>('/admin/auth/login', { username, password });
    secureStorage.setItem(TOKEN_KEY, vo.token);
    secureStorage.setItem(TOKEN_NAME_KEY, vo.tokenName || 'Admin-Authorization');
    set({
      token: vo.token,
      admin: {
        id: vo.adminId,
        username: vo.username,
        nickname: vo.nickname,
        avatar: vo.avatar,
        roleCode: vo.roleCode,
        roleName: vo.roleName,
        permissions: vo.permissions,
      },
      authStatus: 'ready',
    });
  },
  logout: async () => {
    try {
      await http.post('/admin/auth/logout');
    } catch {
      // ignore
    }
    secureStorage.removeItem(TOKEN_KEY);
    secureStorage.removeItem(TOKEN_NAME_KEY);
    set({ token: null, admin: null, authStatus: 'ready' });
  },
  refresh: async () => {
    if (!get().token) return;
    set({ authStatus: 'loading' });
    try {
      const u = await http.get<any, any>('/admin/auth/me');
      set({
        admin: {
          id: u.adminId ?? u.id,
          username: u.username,
          nickname: u.nickname,
          avatar: u.avatar,
          roleCode: u.roleCode,
          roleName: u.roleName,
          permissions: u.permissions,
        },
        authStatus: 'ready',
      });
    } catch {
      secureStorage.removeItem(TOKEN_KEY);
      secureStorage.removeItem(TOKEN_NAME_KEY);
      set({ token: null, admin: null, authStatus: 'error' });
    }
  },
}));
