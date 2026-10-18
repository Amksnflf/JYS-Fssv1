import { create } from 'zustand';
import { fetchSymbols, type SymbolRow } from '@/api/quote';

export const FAV_KEY = 'aster_market_favs';

type TradeType = 'spot' | 'perp' | 'option';
type ScopeType = 'active' | 'all';
type SymbolFetchMode = 'full' | 'light';

type CacheEntry = {
  rows: SymbolRow[];
  fetchedAt: number;
};

interface MarketState {
  favorites: Set<string>;
  cache: Record<string, CacheEntry>;
  inflight: Record<string, Promise<SymbolRow[]>>;
  initialized: boolean;
  initFavorites: () => void;
  toggleFavorite: (code: string) => boolean;
  isFavorite: (code?: string | null) => boolean;
  readSymbols: (tradeType: string, category?: string, scope?: ScopeType, mode?: SymbolFetchMode) => SymbolRow[];
  getSymbols: (tradeType: string, category?: string, scope?: ScopeType, ttlMs?: number, mode?: SymbolFetchMode) => Promise<SymbolRow[]>;
  primeSymbols: (tradeType: string, category?: string, scope?: ScopeType, rows?: SymbolRow[], mode?: SymbolFetchMode) => void;
  clearCache: () => void;
}

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
}

function persistFavorites(next: Set<string>) {
  localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(next)));
}

function buildCacheKey(tradeType: string, category = 'crypto', scope: ScopeType = 'active', mode: SymbolFetchMode = 'full') {
  return `${tradeType}|${category}|${scope}|${mode}`;
}

function isTradeType(value: string): value is TradeType {
  return value === 'spot' || value === 'perp' || value === 'option';
}

export const useMarketStore = create<MarketState>((set, get) => ({
  favorites: new Set<string>(),
  cache: {},
  inflight: {},
  initialized: false,

  initFavorites: () => {
    if (get().initialized) return;
    set({ favorites: loadFavorites(), initialized: true });
  },

  toggleFavorite: (code) => {
    const normalized = code?.trim();
    if (!normalized) return false;
    const next = new Set(get().favorites);
    const willFavorite = !next.has(normalized);
    if (willFavorite) next.add(normalized);
    else next.delete(normalized);
    persistFavorites(next);
    set({ favorites: next, initialized: true });
    return willFavorite;
  },

  isFavorite: (code) => {
    const normalized = code?.trim();
    return normalized ? get().favorites.has(normalized) : false;
  },

  readSymbols: (tradeType, category = 'crypto', scope = 'active', mode = 'full') => {
    const safeTradeType = isTradeType(tradeType) ? tradeType : 'spot';
    const key = buildCacheKey(safeTradeType, category, scope, mode);
    return get().cache[key]?.rows ?? [];
  },

  getSymbols: async (tradeType, category = 'crypto', scope = 'active', ttlMs = 90_000, mode = 'full') => {
    const safeTradeType = isTradeType(tradeType) ? tradeType : 'spot';
    const key = buildCacheKey(safeTradeType, category, scope, mode);
    const cached = get().cache[key];
    const now = Date.now();
    if (cached && now - cached.fetchedAt < ttlMs) {
      return cached.rows;
    }
    const pending = get().inflight[key];
    if (pending) {
      return pending;
    }

    const request = fetchSymbols(safeTradeType, category, scope, mode === 'light')
      .then((rows) => {
        const resolvedRows = rows ?? [];
        set((state) => {
          const nextInflight = { ...state.inflight };
          delete nextInflight[key];
          return {
            inflight: nextInflight,
            cache: {
              ...state.cache,
              [key]: {
                rows: resolvedRows,
                fetchedAt: Date.now(),
              },
            },
          };
        });
        return resolvedRows;
      })
      .catch((error) => {
        set((state) => {
          const nextInflight = { ...state.inflight };
          delete nextInflight[key];
          return { inflight: nextInflight };
        });
        throw error;
      });
    set((state) => ({
      inflight: {
        ...state.inflight,
        [key]: request,
      },
    }));
    return request;
  },

  primeSymbols: (tradeType, category = 'crypto', scope = 'active', rows = [], mode = 'full') => {
    const safeTradeType = isTradeType(tradeType) ? tradeType : 'spot';
    const key = buildCacheKey(safeTradeType, category, scope, mode);
    set((state) => ({
      cache: {
        ...state.cache,
        [key]: {
          rows,
          fetchedAt: Date.now(),
        },
      },
    }));
  },

  clearCache: () => set({ cache: {}, inflight: {} }),
}));
