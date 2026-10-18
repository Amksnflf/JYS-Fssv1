import http from './http';

export interface SupportCategory {
  id: number;
  categoryKey: string;
  categoryName: string;
  parentKey?: string | null;
  enabled: number;
  sort: number;
}

// Backend returns one category row per language: a base key (Simplified Chinese,
// e.g. `account`) plus language-suffixed copies (`account_en`, `account_jt`, ...).
// Maps each i18n language code to its backend suffix ('' = base = zh-CN).
const CATEGORY_LANG_SUFFIX: Record<string, string> = {
  'zh-CN': '',
  'zh-TW': 'jt',
  en: 'en',
  de: 'de',
  ru: 'ru',
  ar: 'ar',
  'pt-BR': 'pt-BR',
  fr: 'fr',
  es: 'es',
  tr: 'tr',
  ja: 'ja',
  ko: 'ko',
  vi: 'vi',
  id: 'id',
  th: 'th',
};

const KNOWN_CATEGORY_SUFFIXES = new Set(
  Object.values(CATEGORY_LANG_SUFFIX).filter(Boolean)
);

// Splits `account_en` into { baseKey: 'account', suffix: 'en' }.
// Base keys never contain '_', so an unrecognized tail is treated as part of the base key.
function splitCategoryKey(key: string): { baseKey: string; suffix: string } {
  const idx = key.indexOf('_');
  if (idx === -1) return { baseKey: key, suffix: '' };
  const suffix = key.slice(idx + 1);
  if (KNOWN_CATEGORY_SUFFIXES.has(suffix)) {
    return { baseKey: key.slice(0, idx), suffix };
  }
  return { baseKey: key, suffix: '' };
}

/**
 * Collapses the multi-language category rows into a single list for the active
 * language. The returned `categoryKey` is always the canonical base key so ticket
 * submission stays language-independent. Falls back to English, then the base row,
 * when a language variant is missing.
 */
export function localizeSupportCategories(
  categories: SupportCategory[],
  lang: string
): SupportCategory[] {
  if (!categories?.length) return [];
  const targetSuffix =
    CATEGORY_LANG_SUFFIX[lang] ??
    CATEGORY_LANG_SUFFIX[lang?.split('-')[0]] ??
    'en';

  const groups = new Map<
    string,
    { base?: SupportCategory; bySuffix: Map<string, SupportCategory> }
  >();
  const order: string[] = [];

  for (const item of categories) {
    const { baseKey, suffix } = splitCategoryKey(item.categoryKey);
    let group = groups.get(baseKey);
    if (!group) {
      group = { bySuffix: new Map() };
      groups.set(baseKey, group);
      order.push(baseKey);
    }
    if (suffix === '') group.base = item;
    else group.bySuffix.set(suffix, item);
  }

  const result: SupportCategory[] = [];
  for (const baseKey of order) {
    const group = groups.get(baseKey)!;
    const chosen =
      (targetSuffix ? group.bySuffix.get(targetSuffix) : group.base) ??
      group.bySuffix.get('en') ??
      group.base ??
      group.bySuffix.values().next().value;
    if (!chosen || !chosen.enabled) continue;
    result.push({
      ...chosen,
      categoryKey: baseKey,
      sort: group.base?.sort ?? chosen.sort ?? 0,
    });
  }

  // Stable sort keeps first-seen order for equal `sort` values.
  return result.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

export interface SupportHubConfig {
  enabled: boolean;
  mode: string;
  vendor: string;
  helpCenterEnabled: boolean;
  ticketEnabled: boolean;
  thirdPartyEnabled: boolean;
  thirdPartyType: string;
  thirdPartyUrl: string;
  thirdPartyScript: string;
  thirdPartyAppId: string;
  fallbackToTicket: boolean;
}

export interface SupportTicket {
  id: number;
  ticketNo: string;
  userId: number;
  userUid?: string;
  userAccount?: string;
  source: string;
  channel: string;
  category: string;
  subcategory?: string;
  subject: string;
  priority: number;
  status: number;
  vendorTicketId?: string;
  assignedAdminId?: number | null;
  assignedGroup?: string | null;
  lastRepliedByType?: number | null;
  lastReplyAt?: string | null;
  riskLevel?: number;
  relatedOrderNo?: string | null;
  relatedSymbol?: string | null;
  relatedCoin?: string | null;
  relatedChain?: string | null;
  lang?: string | null;
  deviceInfo?: string | null;
  remark?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupportTicketMessage {
  id: number;
  ticketId: number;
  senderType: number;
  senderId?: number | null;
  messageType: string;
  content?: string | null;
  attachments?: string | null;
  internalOnly: number;
  createdAt?: string;
}

export interface SupportTicketDetail {
  ticket: SupportTicket;
  messages: SupportTicketMessage[];
}

export interface SupportPage<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

export interface CreateSupportTicketPayload {
  source?: string;
  channel?: string;
  category: string;
  subcategory?: string;
  subject?: string;
  priority?: number;
  riskLevel?: number;
  relatedOrderNo?: string;
  relatedSymbol?: string;
  relatedCoin?: string;
  relatedChain?: string;
  lang?: string;
  deviceInfo?: string;
  remark?: string;
  messageType?: string;
  content: string;
  attachments?: string;
}

export interface ReplySupportTicketPayload {
  messageType?: string;
  content?: string;
  attachments?: string;
}

export const fetchSupportConfig = () =>
  http.get<SupportHubConfig, SupportHubConfig>('/support/public/config');

export const fetchSupportConfigFallback = () =>
  http.get<SupportHubConfig, SupportHubConfig>('/public/support/config');

export const fetchSupportCategories = () =>
  http.get<SupportCategory[], SupportCategory[]>('/support/public/categories');

export const createSupportTicket = (data: CreateSupportTicketPayload) =>
  http.post<SupportTicket, SupportTicket>('/support/ticket/create', data);

export const fetchMySupportTickets = (params: { pageNo?: number; pageSize?: number; status?: number } = {}) =>
  http.get<SupportPage<SupportTicket>, SupportPage<SupportTicket>>('/support/ticket/my', { params });

export const fetchSupportTicketDetail = (id: number | string) =>
  http.get<SupportTicketDetail, SupportTicketDetail>(`/support/ticket/${id}`);

export const replySupportTicket = (id: number | string, data: ReplySupportTicketPayload) =>
  http.post<SupportTicket, SupportTicket>(`/support/ticket/${id}/reply`, data);

export const closeSupportTicket = (id: number | string) =>
  http.post<SupportTicket, SupportTicket>(`/support/ticket/${id}/close`);
