import http from './http';

export const changeLoginPwd = (data: { oldPassword: string; newPassword: string }) =>
  http.post<void, void>('/security/login-password', data);

export const setPayPwd = (data: { oldPassword?: string; newPassword: string }) =>
  http.post<void, void>('/security/pay-password', data);

export const bindEmail = (data: { email: string; code: string }) =>
  http.post<void, void>('/security/bind-email', data);

export interface GooglePrepareVO {
  secret: string;
  otpauthUrl: string;
  qrDataUri: string;
}
export const prepareGoogle = () => http.get<GooglePrepareVO, GooglePrepareVO>('/security/google/prepare');

export const enableGoogle = (data: { secret: string; code: string }) =>
  http.post<void, void>('/security/google/enable', data);

export const disableGoogle = (data: { code: string }) =>
  http.post<void, void>('/security/google/disable', data);
