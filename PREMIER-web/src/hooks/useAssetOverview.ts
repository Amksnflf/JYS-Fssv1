import { useEffect, useState } from 'react';
import {
  fetchOverview,
  fetchOverviewCached,
  getOverviewCacheSnapshot,
  type AssetOverview,
} from '@/api/asset';
import { useUserStore } from '@/store/userStore';

export function useAssetOverview(auto = true) {
  const token = useUserStore((s) => s.token);
  const [overview, setOverview] = useState<AssetOverview | null>(() => getOverviewCacheSnapshot());
  const [loading, setLoading] = useState(() => !getOverviewCacheSnapshot());
  const [loaded, setLoaded] = useState(() => !!getOverviewCacheSnapshot());

  const refresh = (force = false) => {
    if (!token) {
      setOverview(null);
      setLoading(false);
      setLoaded(false);
      return Promise.resolve<AssetOverview | null>(null);
    }

    const cached = getOverviewCacheSnapshot();
    if (!force && cached) {
      setOverview(cached);
      setLoaded(true);
      setLoading(false);
    } else if (!cached && !loaded) {
      setLoading(true);
    }

    const request = force ? fetchOverview(true) : fetchOverviewCached();
    return request
      .then((next) => {
        setOverview(next);
        setLoaded(true);
        setLoading(false);
        return next;
      })
      .catch((error) => {
        setLoading(false);
        throw error;
      });
  };

  useEffect(() => {
    if (!token) {
      setOverview(null);
      setLoading(false);
      setLoaded(false);
      return;
    }

    const cached = getOverviewCacheSnapshot();
    if (cached) {
      setOverview(cached);
      setLoaded(true);
      setLoading(false);
    } else if (!loaded) {
      setLoading(true);
    }

    if (!auto) return;
    void refresh(false).catch(() => undefined);
  }, [auto, token]);

  return {
    overview,
    loading,
    loaded,
    refresh,
  };
}
