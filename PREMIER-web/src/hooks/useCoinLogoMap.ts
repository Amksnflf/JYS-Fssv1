import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { fetchCoinListCached, getCoinListCacheSnapshot, type CoinInfo } from '@/api/asset';

type CoinLogoState = {
  coins: CoinInfo[];
  loading: boolean;
  loaded: boolean;
};

const initialCoins = getCoinListCacheSnapshot() ?? [];
let coinLogoState: CoinLogoState = {
  coins: initialCoins,
  loading: initialCoins.length === 0,
  loaded: initialCoins.length > 0,
};
let coinLogoPromise: Promise<CoinInfo[]> | null = null;
const coinLogoListeners = new Set<() => void>();

function emitCoinLogoState() {
  coinLogoListeners.forEach((listener) => listener());
}

function setCoinLogoState(nextState: CoinLogoState) {
  coinLogoState = nextState;
  emitCoinLogoState();
}

function subscribeCoinLogoState(listener: () => void) {
  coinLogoListeners.add(listener);
  return () => {
    coinLogoListeners.delete(listener);
  };
}

function getCoinLogoStateSnapshot() {
  return coinLogoState;
}

function ensureCoinLogoStateLoaded(force = false) {
  if (!force && coinLogoState.loaded && coinLogoState.coins.length > 0) {
    return Promise.resolve(coinLogoState.coins);
  }
  if (!force && coinLogoPromise) {
    return coinLogoPromise;
  }

  if (force || (!coinLogoState.loading && coinLogoState.coins.length === 0)) {
    setCoinLogoState({
      ...coinLogoState,
      loading: true,
    });
  }

  coinLogoPromise = fetchCoinListCached(force)
    .then((rows) => {
      const nextCoins = rows ?? [];
      setCoinLogoState({
        coins: nextCoins,
        loading: false,
        loaded: true,
      });
      return nextCoins;
    })
    .catch((error) => {
      setCoinLogoState({
        ...coinLogoState,
        loading: false,
      });
      throw error;
    })
    .finally(() => {
      coinLogoPromise = null;
    });

  return coinLogoPromise;
}

export function useCoinLogoMap() {
  const { coins, loading } = useSyncExternalStore(
    subscribeCoinLogoState,
    getCoinLogoStateSnapshot,
    getCoinLogoStateSnapshot
  );

  useEffect(() => {
    void ensureCoinLogoStateLoaded().catch(() => undefined);
  }, []);

  const logoMap = useMemo(
    () => new Map(coins.map((item) => [item.code.toUpperCase(), item.logo ?? null])),
    [coins]
  );

  return useMemo(
    () => ({ logoMap, loading }),
    [loading, logoMap]
  );
}
