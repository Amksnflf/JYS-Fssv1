import { useEffect } from 'react';
import { useMarketStore } from '@/store/marketStore';

export function useFavoriteSymbols() {
  const favorites = useMarketStore((state) => state.favorites);
  const initialized = useMarketStore((state) => state.initialized);
  const initFavorites = useMarketStore((state) => state.initFavorites);
  const toggleFavorite = useMarketStore((state) => state.toggleFavorite);
  const isFavorite = useMarketStore((state) => state.isFavorite);

  useEffect(() => {
    if (!initialized) initFavorites();
  }, [initFavorites, initialized]);

  return {
    favorites,
    initialized,
    toggleFavorite,
    isFavorite,
  };
}
