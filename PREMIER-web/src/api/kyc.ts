import http from './http';
import { compressImageForUpload, fileToDataUrl } from '@/utils/imageCompress';

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

export interface UploadImageResp {
  url?: string;
  path?: string;
  filename?: string;
}

function extractUploadedUrl(res: unknown): string {
  if (!res) return '';
  if (typeof res === 'string') return res;
  if (typeof res === 'object') {
    const obj = res as UploadImageResp;
    return obj.url || obj.path || '';
  }
  return '';
}

export async function uploadKycImage(file: File): Promise<string> {
  const compressed = await compressImageForUpload(file, 1280, 0.78);
  const formData = new FormData();
  formData.append('file', compressed);
  formData.append('biz', 'kyc');

  try {
    const res = await http.post<UploadImageResp | string, UploadImageResp | string>('/kyc/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 12000,
    });
    const url = extractUploadedUrl(res);
    if (url) return url;
  } catch {
    try {
      const res = await http.post<UploadImageResp | string, UploadImageResp | string>('/public/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 12000,
      });
      const url = extractUploadedUrl(res);
      if (url) return url;
    } catch {
      // Fallback to compressed DataURL if multipart endpoint is unavailable
    }
  }
  return fileToDataUrl(compressed);
}

export const submitKyc = (data: KycSubmitPayload) =>
  http.post<void, void>('/kyc/submit', data);

export const myKyc = () => http.get<KycRecord[], KycRecord[]>('/kyc/my');
