import http, { getToken } from './http';
import type { PageData } from './asset';

const MY_NFT_COUNT_CACHE_KEY = 'aster.my-nft-count.cache.v1';
const MY_NFT_COUNT_CACHE_TTL_MS = 30_000;
let myNftCountCache: NftCountCacheEntry | null = readMyNftCountCache();
let myNftCountPromise: Promise<number> | null = null;
let myNftCountPromiseScope: string | null = null;

interface NftCountCacheEntry {
  scope: string;
  updatedAt: number;
  total: number;
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

function readMyNftCountCache() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MY_NFT_COUNT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.scope !== 'string' || typeof parsed.updatedAt !== 'number' || typeof parsed.total !== 'number') return null;
    return parsed as NftCountCacheEntry;
  } catch {
    return null;
  }
}

function writeMyNftCountCache(total: number, scope = currentAuthScope()) {
  const entry: NftCountCacheEntry = {
    scope,
    updatedAt: Date.now(),
    total,
  };
  myNftCountCache = entry;
  if (typeof window === 'undefined') return entry;
  try {
    window.localStorage.setItem(MY_NFT_COUNT_CACHE_KEY, JSON.stringify(entry));
  } catch {}
  return entry;
}

export interface NftCollection {
  id: number;
  name: string;
  cover?: string;
  banner?: string;
  category?: string;
  description?: string;
  videoUrl?: string;
  verified: number;
  floorPrice: string;
  volume?: string;
  latestPrice?: string;
  itemCount: number;
  isHot: number;
}

export interface NftItem {
  id: number;
  collectionId: number;
  name: string;
  image: string;
  tokenNo?: string;
  contractAddress?: string;
  network?: string;
  tokenCode?: string;
  tokenStandard?: string;
  royaltyRate?: string;
  usdPrice?: string;
  attributesJson?: string;
  price: string;
  coin: string;
  ownerId?: number;
  status: number;
}

export interface NftStats {
  nftTradingNumber: number;
  nftTradingVolume: string | number;
  nftNFTNumber: number;
  nftNumOfBeneficiaries: number;
  nftVideoLiveUrl1?: string;
}

export interface NftIncome {
  address: string;
  tokenNo: string;
  income: string | number;
}

export const fetchNftCollections = () =>
  http.get<NftCollection[], NftCollection[]>('/nft/public/collections');

export const fetchNftItems = (collectionId?: number, status = 1, pageNo = 1, pageSize = 20) =>
  http.get<PageData<NftItem>, PageData<NftItem>>('/nft/public/items', {
    params: { collectionId, status, pageNo, pageSize },
  });

export const fetchNftStats = () =>
  http.get<NftStats, NftStats>('/nft/public/stats');

export const fetchNftIncomes = (limit = 10) =>
  http.get<NftIncome[], NftIncome[]>('/nft/public/incomes', { params: { limit } });

export const fetchNftCollectionDetail = (id: number) =>
  http.get<NftCollection, NftCollection>(`/nft/public/collection/${id}`);

export const fetchNftItemDetail = (id: number) =>
  http.get<NftItem, NftItem>(`/nft/public/item/${id}`);

export const buyNft = (itemId: number) =>
  http.post<unknown, unknown>(`/nft/buy/${itemId}`);

export const fetchMyNfts = (pageNo = 1, pageSize = 20) =>
  http.get<PageData<NftItem>, PageData<NftItem>>('/nft/my', {
    params: { pageNo, pageSize },
  });

export const getMyNftCountCacheSnapshot = () =>
  myNftCountCache?.scope === currentAuthScope() ? myNftCountCache.total : null;

export const fetchMyNftCountCached = (force = false, maxAgeMs = MY_NFT_COUNT_CACHE_TTL_MS) => {
  const scope = currentAuthScope();
  const isFresh = !!myNftCountCache
    && myNftCountCache.scope === scope
    && Date.now() - myNftCountCache.updatedAt <= maxAgeMs;
  if (!force && isFresh) {
    return Promise.resolve(myNftCountCache!.total);
  }
  if (!force && myNftCountPromise && myNftCountPromiseScope === scope) {
    return myNftCountPromise;
  }

  myNftCountPromiseScope = scope;
  myNftCountPromise = fetchMyNfts(1, 1)
    .then((page) => {
      const total = page?.total ?? 0;
      writeMyNftCountCache(total, scope);
      return total;
    })
    .finally(() => {
      myNftCountPromise = null;
      myNftCountPromiseScope = null;
    });

  return myNftCountPromise.catch((error) => {
    if (!force && myNftCountCache?.scope === scope) {
      return myNftCountCache.total;
    }
    throw error;
  });
};
