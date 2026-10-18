import { useEffect, useState } from 'react';
import type { SymbolRow } from '@/api/quote';
import { useMarketStore } from '@/store/marketStore';

export function useMarketSymbols(
  tradeType: string,
  category = 'crypto',
  scope: 'active' | 'all' = 'active',
  enabled = true,
  ttlMs = 90_000,
  mode: 'full' | 'light' = 'full'
) {
  const getSymbols = useMarketStore((state) => state.getSymbols);
  const [rows, setRows] = useState<SymbolRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    getSymbols(tradeType, category, scope, ttlMs, mode)
      .then((data) => {
        if (!cancelled) setRows(data ?? []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, enabled, getSymbols, mode, scope, tradeType, ttlMs]);

  return { rows, setRows, loading };
}
