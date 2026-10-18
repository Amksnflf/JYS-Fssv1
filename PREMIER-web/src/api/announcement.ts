import http from './http';

export interface AnnouncementItem {
  id: number;
  title: string;
  content?: string;
  category?: string;
  lang?: string;
  top?: number;
  published?: number;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const fetchAnnouncementPage = (pageNo = 1, pageSize = 20, lang?: string) =>
  http.get<{ records: AnnouncementItem[]; total: number }, { records: AnnouncementItem[]; total: number }>(
    '/announcement/public/page',
    { params: { pageNo, pageSize, lang } }
  );

export const fetchAnnouncementDetail = (id: number) =>
  http.get<AnnouncementItem, AnnouncementItem>(`/announcement/public/${id}`);
