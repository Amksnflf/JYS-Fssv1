import http from './http';

export interface KycRecord {
  id: number;
  userId: number;
  level: number;
  country: string;
  realName: string;
  idType: string;
  idNo: string;
  idFrontUrl?: string;
  idBackUrl?: string;
  faceUrl?: string;
  auditStatus: number;
  auditRemark?: string;
  createdAt: string;
}

export interface KycSubmitPayload {
  level: 1 | 2;
  country: string;
  realName: string;
  idType: string;
  idNo: string;
  idFrontUrl?: string;
  idBackUrl?: string;
  faceUrl?: string;
}

export const submitKyc = (data: KycSubmitPayload) =>
  http.post<void, void>('/kyc/submit', data);

export const myKyc = () => http.get<KycRecord[], KycRecord[]>('/kyc/my');
