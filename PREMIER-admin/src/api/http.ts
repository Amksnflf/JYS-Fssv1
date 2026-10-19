import axios, { type AxiosResponse } from 'axios';
import { message } from 'antd';
import { secureStorage } from '@/utils/secureStorage';

export const TOKEN_KEY = 'aster_admin_token';
export const TOKEN_NAME_KEY = 'aster_admin_token_name';

const http = axios.create({
  baseURL: '/api',
  timeout: 20000,
});

function adminLoginPath() {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/$/, '')}/login`;
}

http.interceptors.request.use((cfg) => {
  const token = secureStorage.getItem(TOKEN_KEY);
  const name = secureStorage.getItem(TOKEN_NAME_KEY) || 'Admin-Authorization';
  if (token && cfg.headers) {
    cfg.headers[name] = token;
  }
  return cfg;
});

http.interceptors.response.use(
  (res: AxiosResponse) => {
    const body = res.data;
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) return body.data;
      // 未登录 / 过期
      if (body.code === 401 || body.code === 11001 || body.code === 11012) {
        secureStorage.removeItem(TOKEN_KEY);
        secureStorage.removeItem(TOKEN_NAME_KEY);
        if (!location.pathname.endsWith('/login')) {
          location.href = adminLoginPath();
        }
      }
      message.error(body.msg || '请求失败');
      return Promise.reject(new Error(body.msg || 'fail'));
    }
    return body;
  },
  (err) => {
    const body = err.response?.data;
    if (err.response?.status === 401) {
      secureStorage.removeItem(TOKEN_KEY);
      secureStorage.removeItem(TOKEN_NAME_KEY);
      if (!location.pathname.endsWith('/login')) {
        location.href = adminLoginPath();
      }
    }
    const msg =
      body && typeof body === 'object' && 'msg' in body && typeof body.msg === 'string'
        ? body.msg
        : err.message || '网络错误';
    message.error(msg);
    return Promise.reject(err);
  }
);

export default http;
