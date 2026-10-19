import http, { getToken } from './http';
import { secureStorage } from '@/utils/secureStorage';

export interface CoinInfo {
  id: number;
  code: string;
  name: string;
  logo?: string | null;
  chain: string;
  decimals: number;
  minDeposit: string;
  minWithdraw: string;
  withdrawFee: string;
  depositEnabled: number;
  withdrawEnabled: number;
  quoteSymbol?: string;
  sort: number;
}

const COIN_LIST_CACHE_KEY = 'aster.coin-list.cache.v1';
const OVERVIEW_CACHE_KEY = 'aster.asset-overview.cache.v1';
const OVERVIEW_CACHE_TTL_MS = 8_000;
let coinListCache: CoinInfo[] | null = readCoinListCache();
let coinListPromise: Promise<CoinInfo[]> | null = null;
let overviewCache: CacheEntry<AssetOverview> | null = readCacheEntry<AssetOverview>(OVERVIEW_CACHE_KEY);
let overviewPromise: Promise<AssetOverview> | null = null;
let overviewPromiseScope: string | null = null;

interface CacheEntry<T> {
  scope: string;
  updatedAt: number;
  value: T;
}

function currentAuthScope() {
  const token = getToken();
  if (!token) return 'guest';
  let hash = 0;
  for (let i = 0; i < token.length; i += 1) {
    hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
  }
  return `u:${hash.toString(16)}`;
}

function readCoinListCache() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = secureStorage.getItem(COIN_LIST_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CoinInfo[]) : null;
  } catch {
    return null;
  }
}

function writeCoinListCache(rows: CoinInfo[]) {
  coinListCache = rows;
  if (typeof window === 'undefined') return;
  try {
    secureStorage.setItem(COIN_LIST_CACHE_KEY, JSON.stringify(rows));
  } catch {}
}

function readCacheEntry<T>(key: string) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = secureStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.scope !== 'string' || typeof parsed.updatedAt !== 'number' || !('value' in parsed)) return null;
    return parsed as CacheEntry<T>;
  } catch {
    return null;
  }
}

function writeCacheEntry<T>(key: string, value: T, scope = currentAuthScope()) {
  const entry: CacheEntry<T> = {
    scope,
    updatedAt: Date.now(),
    value,
  };
  if (key === OVERVIEW_CACHE_KEY) {
    overviewCache = entry as CacheEntry<AssetOverview>;
  }
  if (typeof window === 'undefined') return entry;
  try {
    secureStorage.setItem(key, JSON.stringify(entry));
  } catch {}
  return entry;
}

export function getCoinListCacheSnapshot() {
  return coinListCache ? [...coinListCache] : null;
}

export interface AccountVO {
  accountType: number;
  coin: string;
  available: string;
  frozen: string;
  valuation: string;
  price: string;
  totalProfit?: string;
  profitRate?: string;
}

export interface AssetOverview {
  totalUsd: string;
  spotTotalUsd: string;
  tradeTotalUsd: string;
  financeTotalUsd: string;
  todayProfit?: string;
  accounts: AccountVO[];
  coinSummary: AccountVO[];
}

function cloneAccount(row: AccountVO): AccountVO {
  return { ...row };
}

function cloneOverview(data: AssetOverview): AssetOverview {
  return {
    ...data,
    accounts: (data.accounts ?? []).map(cloneAccount),
    coinSummary: (data.coinSummary ?? []).map(cloneAccount),
  };
}

function isOverviewCacheFresh(maxAgeMs: number) {
  return !!overviewCache
    && overviewCache.scope === currentAuthScope()
    && Date.now() - overviewCache.updatedAt <= maxAgeMs;
}

function writeOverviewCache(data: AssetOverview, scope = currentAuthScope()) {
  return writeCacheEntry(OVERVIEW_CACHE_KEY, cloneOverview(data), scope);
}

export function getOverviewCacheSnapshot() {
  return overviewCache && overviewCache.scope === currentAuthScope()
    ? cloneOverview(overviewCache.value)
    : null;
}

export interface DepositOrder {
  id: number;
  orderNo: string;
  coin: string;
  chain: string;
  amount: string;
  channel?: string;
  expectedAmount?: string;
  actualAmount?: string;
  txHash?: string;
  toAddress?: string;
  memo?: string;
  status: number;
  expireAt?: string;
  createdAt: string;
}

export interface WithdrawOrder {
  id: number;
  orderNo: string;
  coin: string;
  chain: string;
  amount: string;
  fee: string;
  toAddress: string;
  status: number;
  createdAt: string;
}

export interface AccountLog {
  id: number;
  accountType: number;
  coin: string;
  bizType: string;
  amount: string;
  balanceAfter: string;
  remark?: string;
  createdAt: string;
}

export interface DepositAddress {
  id: number;
  coin: string;
  chain: string;
  address: string;
  memo?: string;
}

export interface PageData<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
}

export const fetchOverview = (force = false) => {
  const scope = currentAuthScope();
  if (!force && overviewPromise && overviewPromiseScope === scope) {
    return overviewPromise.then((data) => cloneOverview(data));
  }

  overviewPromiseScope = scope;
  overviewPromise = http
    .get<AssetOverview, AssetOverview>('/asset/overview')
    .then((data) => {
      const next = cloneOverview(data);
      writeOverviewCache(next, scope);
      return next;
    })
    .finally(() => {
      overviewPromise = null;
      overviewPromiseScope = null;
    });

  return overviewPromise.then((data) => cloneOverview(data));
};

export const fetchOverviewCached = (force = false, maxAgeMs = OVERVIEW_CACHE_TTL_MS) => {
  if (!force && isOverviewCacheFresh(maxAgeMs)) {
    return Promise.resolve(cloneOverview(overviewCache!.value));
  }
  return fetchOverview(force).catch((error) => {
    if (!force && overviewCache && overviewCache.scope === currentAuthScope()) {
      return cloneOverview(overviewCache.value);
    }
    throw error;
  });
};

export const fetchCoinList = () =>
  http.get<CoinInfo[], CoinInfo[]>('/asset/coin/list');

export const fetchCoinListCached = (force = false) => {
  if (!force && coinListCache) {
    return Promise.resolve([...coinListCache]);
  }
  if (!force && coinListPromise) {
    return coinListPromise.then((rows) => [...rows]);
  }

  coinListPromise = fetchCoinList()
    .then((rows) => {
      const next = rows ?? [];
      writeCoinListCache(next);
      return next;
    })
    .catch((error) => {
      if (coinListCache) {
        return coinListCache;
      }
      throw error;
    })
    .finally(() => {
      coinListPromise = null;
    });

  return coinListPromise.then((rows) => [...rows]);
};

export const fetchDepositAddress = (coin: string) =>
  http.get<DepositAddress[], DepositAddress[]>('/asset/coin/deposit-address', {
    params: { coin },
  });

export interface DepositSubmitDTO {
  coin: string;
  chain?: string;
  amount: number | string;
  txHash: string;
  fromAddress?: string;
  toAddress?: string;
  screenshotUrl?: string;
}

export const submitDeposit = (dto: DepositSubmitDTO) =>
  http.post<DepositOrder, DepositOrder>('/asset/deposit/submit', dto);

export interface DepositMode {
  mode: 'MANUAL' | 'UDUN' | 'BOTH';
  manualEnabled: number;
  udunEnabled: number;
  fallbackToManual: number;
  minAmount?: string;
  maxAmount?: string;
}

export const fetchDepositMode = (coin: string, chain?: string) =>
  http.get<DepositMode, DepositMode>('/asset/deposit/mode', {
    params: { coin, chain },
  });

export const createUdunDepositOrder = (dto: {
  coin: string;
  chain?: string;
  amount?: number | string;
}) => http.post<DepositOrder, DepositOrder>('/asset/deposit/udun/order', dto);

export const fetchDepositOrder = (orderNo: string) =>
  http.get<DepositOrder, DepositOrder>(`/asset/deposit/order/${orderNo}`);

export const fetchDepositOrders = (pageNo = 1, pageSize = 20, status?: number) =>
  http.get<PageData<DepositOrder>, PageData<DepositOrder>>('/asset/deposit/my', {
    params: { pageNo, pageSize, status },
  });

export interface WithdrawSubmitDTO {
  coin: string;
  chain?: string;
  amount: number | string;
  toAddress: string;
  memo?: string;
  payPassword?: string;
}

export const submitWithdraw = (dto: WithdrawSubmitDTO) =>
  http.post<WithdrawOrder, WithdrawOrder>('/asset/withdraw/submit', dto);

export const fetchWithdrawOrders = (pageNo = 1, pageSize = 20, status?: number) =>
  http.get<PageData<WithdrawOrder>, PageData<WithdrawOrder>>('/asset/withdraw/my', {
    params: { pageNo, pageSize, status },
  });

export const transfer = (
  fromAccount: number,
  toAccount: number,
  coin: string,
  amount: number | string
) =>
  http.post<unknown, unknown>('/asset/transfer', {
    fromAccount,
    toAccount,
    coin,
    amount,
  });

export const fetchBillPage = (params: {
  pageNo?: number;
  pageSize?: number;
  coin?: string;
  bizType?: string;
  accountType?: number;
}) =>
  http.get<PageData<AccountLog>, PageData<AccountLog>>('/asset/bill/page', {
    params,
  });

export interface AddressItem {
  id: number;
  coin: string;
  chain: string;
  address: string;
  memo?: string;
  remark?: string;
  whitelist: number;
  createdAt: string;
}

export const fetchAddresses = (coin?: string) =>
  http.get<AddressItem[], AddressItem[]>('/asset/address/list', {
    params: { coin },
  });

export const addAddress = (dto: {
  coin: string;
  chain: string;
  address: string;
  memo?: string;
  remark?: string;
  whitelist?: boolean;
}) => http.post<AddressItem, AddressItem>('/asset/address/add', dto);

export const deleteAddress = (id: number) =>
  http.delete<void, void>(`/asset/address/${id}`);
