import http from './http';

export interface LoginVO {
  token: string;
  tokenName: string;
  userId: number;
  uid: string;
  nickname: string;
  avatar?: string;
  kycLevel: number;
  vipLevel: number;
  inviteCode: string;
  googleEnabled: boolean;
}

export interface UserInfoVO {
  userId: number;
  uid: string;
  account?: string;
  nickname: string;
  avatar?: string;
  countryCode?: string;
  phone?: string;
  email?: string;
  kycLevel: number;
  vipLevel: number;
  inviteCode: string;
  phoneBound: boolean;
  emailBound: boolean;
  googleEnabled: boolean;
  payPwdSet: boolean;
}

export type RegisterType = 'phone' | 'email' | 'account';

export interface RegisterPayload {
  type: RegisterType;
  countryCode?: string;
  phone?: string;
  email?: string;
  account?: string;
  password: string;
  code?: string;
  inviteCode?: string;
}

export interface LoginPayload {
  type: RegisterType;
  identifier: string;
  countryCode?: string;
  password: string;
  googleCode?: string;
}

export const sendCode = (data: {
  targetType: 'phone' | 'email';
  target: string;
  scene: string;
  countryCode?: string;
}) => http.post<void, void>('/auth/send-code', data);

export const register = (data: RegisterPayload) =>
  http.post<LoginVO, LoginVO>('/auth/register', data);

export const login = (data: LoginPayload) =>
  http.post<LoginVO, LoginVO>('/auth/login', data);

export const logout = () => http.post<void, void>('/auth/logout');

export const forgotPassword = (data: {
  type: 'phone' | 'email';
  countryCode?: string;
  identifier: string;
  code: string;
  newPassword: string;
}) => http.post<void, void>('/auth/forgot-password', data);

export const getUserInfo = () => http.get<UserInfoVO, UserInfoVO>('/user/info');

export const updateProfile = (data: { nickname?: string; avatar?: string }) =>
  http.post<void, void>('/user/profile', data);

export const walletNonce = (address: string, chain?: string) =>
  http.get<{ nonce: string }, { nonce: string }>('/auth/wallet/nonce', {
    params: { address, chain },
  });

export const walletLogin = (data: {
  walletType: string;
  chain: string;
  address: string;
  signature: string;
}) => http.post<LoginVO, LoginVO>('/auth/wallet/login', data);
