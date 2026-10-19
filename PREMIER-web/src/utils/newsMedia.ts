import type { NewsItem } from '@/api/quote';
import { brandName } from '@/brand';

const FALLBACK_COVERS = [
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1639762681057-408e52192e55?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&w=1200&q=80',
];

const FALLBACK_AVATARS = [
  'https://i.pravatar.cc/160?img=12',
  'https://i.pravatar.cc/160?img=18',
  'https://i.pravatar.cc/160?img=24',
  'https://i.pravatar.cc/160?img=31',
  'https://i.pravatar.cc/160?img=37',
  'https://i.pravatar.cc/160?img=49',
  'https://i.pravatar.cc/160?img=56',
  'https://i.pravatar.cc/160?img=65',
];

export function getNewsCover(news: Partial<NewsItem>) {
  return normalizeUrl(news.cover) || pickStableItem(FALLBACK_COVERS, buildSeed(news, 'cover'));
}

export function getNewsAvatar(news: Partial<NewsItem>) {
  return normalizeAvatar(news.authorAvatar) || pickStableItem(FALLBACK_AVATARS, buildSeed(news, 'avatar'));
}

export function getNewsPreviewText(news: Partial<NewsItem>) {
  const summary = normalizeText(news.summary);
  if (summary) {
    return summary;
  }
  const contentText = stripHtml(news.content);
  if (contentText) {
    return contentText.length > 100 ? `${contentText.slice(0, 100)}...` : contentText;
  }
  return normalizeText(news.title) || `${brandName} News`;
}

export function formatNewsTime(value?: string) {
  if (!value) return '--';
  return value.replace('T', ' ').replace(/\//g, '-').slice(0, 19);
}

function buildSeed(news: Partial<NewsItem>, suffix: string) {
  return [news.id, news.externalId, news.title, news.sourceName, suffix].filter(Boolean).join('-');
}

function pickStableItem<T>(items: T[], seed: string) {
  const value = hashString(seed || 'news');
  return items[value % items.length];
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function stripHtml(value?: string) {
  const html = normalizeText(value);
  if (!html) {
    return '';
  }
  if (typeof DOMParser === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
}

function normalizeText(value?: string) {
  const text = value?.trim();
  return text ? text : '';
}

function normalizeUrl(value?: string) {
  const url = value?.trim();
  if (!url || url.startsWith('data:')) {
    return '';
  }
  const normalizedUpload = normalizeUploadPath(url);
  if (normalizedUpload.startsWith('/uploads/')) {
    return `/api${normalizedUpload}`;
  }
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  return normalizedUpload;
}

function normalizeAvatar(value?: string) {
  const avatar = normalizeUrl(value);
  if (!avatar) {
    return '';
  }
  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(avatar) || avatar.includes('/uploads/') || avatar.includes('pravatar')
    ? avatar
    : '';
}

function normalizeUploadPath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/api/uploads/')) return trimmed.slice(4);
  if (trimmed.startsWith('api/uploads/')) return `/${trimmed.slice(4)}`;
  if (trimmed.startsWith('/uploads/')) return trimmed;
  if (trimmed.startsWith('uploads/')) return `/${trimmed}`;

  const apiUploadsIndex = trimmed.indexOf('/api/uploads/');
  if (apiUploadsIndex >= 0) return trimmed.slice(apiUploadsIndex + 4);

  const uploadsIndex = trimmed.indexOf('/uploads/');
  if (uploadsIndex >= 0) return trimmed.slice(uploadsIndex);

  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}
