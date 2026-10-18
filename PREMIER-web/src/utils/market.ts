import type { SymbolRow } from '@/api/quote';

type RoutedTradeType = 'spot' | 'perp' | 'option';
type SymbolTarget = Pick<SymbolRow, 'symbol' | 'alltickCode' | 'category' | 'tradeType' | 'tradeMode' | 'subscribeEnabled'>;

function normalizeTradeType(value?: string): RoutedTradeType {
  if (value === 'perp' || value === 'option') return value;
  return 'spot';
}

export function isViewOnlySpot(row?: SymbolTarget | null) {
  if (!row || row.tradeType !== 'spot') return false;
  if (row.tradeMode === 'limited') return true;
  if (row.category === 'forex') return false;
  return row.subscribeEnabled !== 1;
}

export function buildSymbolSearchParams(
  row: Pick<SymbolTarget, 'symbol' | 'alltickCode' | 'category'>,
  fallbackCategory?: string,
  extras: Record<string, string | undefined> = {},
) {
  const params = new URLSearchParams({
    symbol: row.symbol,
    code: row.alltickCode,
    category: row.category || fallbackCategory || 'crypto',
  });
  Object.entries(extras).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params;
}

export function buildTradePagePath(
  tradeType: string | undefined,
  row: Pick<SymbolTarget, 'symbol' | 'alltickCode' | 'category'>,
  fallbackCategory?: string,
) {
  const safeTradeType = normalizeTradeType(tradeType);
  const basePath = safeTradeType === 'perp' ? '/perp' : safeTradeType === 'option' ? '/option' : '/trade';
  return `${basePath}?${buildSymbolSearchParams(row, fallbackCategory).toString()}`;
}

export function buildKlinePath(
  row: Pick<SymbolTarget, 'symbol' | 'alltickCode' | 'category'>,
  fallbackCategory?: string,
  tradeType?: string,
  scope: 'active' | 'all' = 'all',
) {
  const safeTradeType = normalizeTradeType(tradeType);
  const params = buildSymbolSearchParams(row, fallbackCategory, {
    type: safeTradeType,
    scope,
  });
  return `/trade/kline?${params.toString()}`;
}
