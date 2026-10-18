import http from './http';
import type { PageData } from './asset';

export interface DynamicItem {
  id: number;
  userId: number;
  content: string;
  images?: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

export const fetchDynamics = (pageNo = 1, pageSize = 20) =>
  http.get<PageData<DynamicItem>, PageData<DynamicItem>>('/dynamic/public/page', {
    params: { pageNo, pageSize },
  });

export const submitDynamic = (content: string, images?: string) =>
  http.post<DynamicItem, DynamicItem>('/dynamic/submit', { content, images });

export const likeDynamic = (id: number) =>
  http.post<DynamicItem, DynamicItem>(`/dynamic/like/${id}`);
