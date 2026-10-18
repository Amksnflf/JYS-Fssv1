import http from './http';

export interface PriceTick {
  symbol: string;
  price: string;
  ts: number | string;
}

export interface QuoteTick {
  symbol: string;
  price: string;
  change: string;
  volume: string;
  ts: number;
}

export interface SymbolRow {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  settlementCoin?: string;
  settlementPrice?: string | null;
  baseLogo?: string | null;
  quoteLogo?: string | null;
  category: string;
  tradeType: string;
  alltickCode: string;
  primarySource?: string;
  depthMode?: string;
  tradeMode?: string;
  pricePrecision: number;
  amountPrecision: number;
  changePrecision?: number;
  isHot: number;
  maxLeverage: number;
  subscribeEnabled?: number;
  price: string | null;
  change: string;
  volume: string;
}

export interface KlineBar {
  time: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export interface QuoteDepthLevel {
  price: string;
  volume: string;
}

export interface QuoteDepth {
  symbol: string;
  ts: number;
  bids: QuoteDepthLevel[];
  asks: QuoteDepthLevel[];
}

export interface QuoteStats24h {
  symbol: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  change?: string;
  volume?: string;
  amount?: string;
  ts: number;
}

export interface QuoteTrade {
  symbol: string;
  price: string;
  volume: string;
  side: 'buy' | 'sell' | 'unknown';
  ts: number;
}

export interface NewsItem {
  id: number;
  title: string;
  summary?: string;
  content?: string;
  cover?: string;
  author?: string;
  authorAvatar?: string;
  sourceName?: string;
  sourceUrl?: string;
  externalId?: string;
  likeCount?: number;
  viewCount?: number;
  tagCoin?: string;
  tagChange?: string | number;
  lang?: string;
  published?: number;
  publishedAt?: string;
}

export const fetchPrice = (symbol: string) =>
  http.get<PriceTick, PriceTick>('/quote/public/price', { params: { symbol } });

export const fetchTick = (symbol: string) =>
  http.get<QuoteTick, QuoteTick>('/quote/public/tick', { params: { symbol } });

export const fetchTicks = (symbols: string[]) =>
  http.get<QuoteTick[], QuoteTick[]>('/quote/public/ticks', {
    params: { symbols: symbols.join(',') },
  });

export const fetchKline = (symbol: string, period = '1m', limit = 200) =>
  http.get<KlineBar[], KlineBar[]>('/quote/public/kline', {
    params: { symbol, period, limit },
  });

export const fetchDepth = (symbol: string) =>
  http.get<QuoteDepth, QuoteDepth>('/quote/public/depth', { params: { symbol } });

export const fetchStats24h = (symbol: string) =>
  http.get<QuoteStats24h, QuoteStats24h>('/quote/public/stats24h', { params: { symbol } });

export const fetchLatestTrades = (symbol: string, limit = 30) =>
  http.get<QuoteTrade[], QuoteTrade[]>('/quote/public/latest-trades', {
    params: { symbol, limit },
  });

export const fetchSymbols = (
  tradeType: string,
  category = 'crypto',
  scope: 'active' | 'all' = 'active',
  light = false
) =>
  http.get<SymbolRow[], SymbolRow[]>('/symbol/public/list', {
    params: { tradeType, category, scope, light },
  });

export interface RankPair {
  gainers: Array<{ symbol: string; baseCoin: string; price: string; change: string; changePrecision?: number }>;
  losers: Array<{ symbol: string; baseCoin: string; price: string; change: string; changePrecision?: number }>;
}

export const fetchRank = (tradeType = 'spot', limit = 5) =>
  http.get<RankPair, RankPair>('/symbol/public/rank', {
    params: { tradeType, limit },
  });

export const fetchNewsPage = (pageNo = 1, pageSize = 20, lang?: string) =>
  http.get<{ records: NewsItem[]; total: number }, { records: NewsItem[]; total: number }>(
    '/news/public/page',
    { params: { pageNo, pageSize, lang } }
  );

export const fetchNewsDetail = (id: number) =>
  http.get<NewsItem, NewsItem>(`/news/public/${id}`);
