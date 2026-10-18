import axios, { AxiosError, AxiosResponse } from 'axios';
import i18n from '@/i18n';

export interface ApiResp<T> {
  code: number;
  msg: string;
  data: T;
}

const TOKEN_KEY = 'aster_token';
let unauthorizedHandler: (() => void) | null = null;

export class ApiError extends Error {
  code?: number;
  data?: unknown;

  constructor(message: string, code?: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.data = data;
  }
}

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

http.interceptors.request.use((cfg) => {
  const token = getToken();
  if (token) {
    cfg.headers.Authorization = token;
  }
  return cfg;
});

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (path.startsWith('/auth/')) return;
  // window.location.assign(`/auth/wallet?redirect=${encodeURIComponent(path)}`);
}

function handleUnauthorized() {
  if (typeof window !== 'undefined' && localStorage.getItem('bypass_auth')) return;
  if (unauthorizedHandler) unauthorizedHandler();
  else clearToken();
  redirectToLogin();
}

http.interceptors.response.use(
  (resp: AxiosResponse<ApiResp<unknown>>) => {
    const body = resp.data;
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code !== 0) {
        if (body.code === 401) {
          handleUnauthorized();
        }
        return Promise.reject(new ApiError(body.msg || i18n.t('common.requestFailed'), body.code, body.data));
      }
      return body.data as never;
    }
    return resp.data as never;
  },
  (err: AxiosError<ApiResp<unknown>>) => {
    if (err.response?.status === 401) {
      handleUnauthorized();
    }
    const d = err.response?.data;
    if (d && typeof d === 'object' && typeof d.msg === 'string' && d.msg) {
      return Promise.reject(new ApiError(d.msg, d.code, d.data));
    }
    return Promise.reject(err);
  }
);

export default http;
