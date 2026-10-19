import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatChangePercent } from '@/utils/number';
import type { QuoteDepth } from '@/api/quote';

interface Props {
  price: number;
  precision: number;
  precisionStep?: number;
  baseCoin?: string;
  quoteCoin?: string;
  mode?: 'both' | 'bids' | 'asks';
  rows?: number;
  compact?: boolean;
  change?: number;
  changePrecision?: number;
  depth?: QuoteDepth | null;
}

interface Row {
  price: number;
  amount: number;
  pct: number;
}

export default function Orderbook({
  price,
  precision,
  precisionStep = 0,
  baseCoin = 'BTC',
  quoteCoin = 'USDT',
  mode = 'both',
  rows = 5,
  compact = false,
  change,
  changePrecision = 2,
  depth,
}: Props) {
  const { t } = useTranslation();
  const displayPrecision = Math.max(0, Math.min(8, precision + Math.max(0, precisionStep)));
  const { asks, bids } = useMemo(() => {
    // 确保买卖盘口按照价格精准排序：
    // Asks 卖盘按价格升序排序 [ask1 (最低卖价), ask2, ... askN]
    const sortedAsks = (depth?.asks ?? [])
      .map((r) => ({ price: Number(r.price), amount: Number(r.volume), pct: 0 }))
      .filter((r) => isFinite(r.price) && isFinite(r.amount) && r.price > 0 && r.amount > 0)
      .sort((a, b) => a.price - b.price)
      .slice(0, rows);

    // Bids 买盘按价格降序排序 [bid1 (最高买价), bid2, ... bidN]
    const sortedBids = (depth?.bids ?? [])
      .map((r) => ({ price: Number(r.price), amount: Number(r.volume), pct: 0 }))
      .filter((r) => isFinite(r.price) && isFinite(r.amount) && r.price > 0 && r.amount > 0)
      .sort((a, b) => b.price - a.price)
      .slice(0, rows);

    let cumA = 0;
    let cumB = 0;
    sortedAsks.forEach((r) => {
      cumA += r.amount;
      r.pct = cumA;
    });
    sortedBids.forEach((r) => {
      cumB += r.amount;
      r.pct = cumB;
    });
    const max = Math.max(cumA, cumB, 1);
    sortedAsks.forEach((r) => (r.pct = (r.pct / max) * 100));
    sortedBids.forEach((r) => (r.pct = (r.pct / max) * 100));

    // 卖盘由高到低展示（卖5在最上方，递减至贴近现价的卖1）
    const asks = [...sortedAsks].reverse();
    // 买盘由贴近现价的买1向下递减至买5
    const bids = sortedBids;
    return { asks, bids };
  }, [depth, rows]);

  const fmt = (n: number) =>
    n.toLocaleString('en-US', {
      minimumFractionDigits: displayPrecision,
      maximumFractionDigits: displayPrecision,
    });

  const fmtAmount = (n: number) => {
    if (!Number.isFinite(n)) return '--';
    if (n >= 1000) return n.toFixed(2);
    return n.toFixed(4);
  };

  const askRows: Array<Row | null> = asks.length ? asks : Array.from({ length: rows }, () => null);
  const bidRows: Array<Row | null> = bids.length ? bids : Array.from({ length: rows }, () => null);

  const isUp = (change ?? 0) >= 0;

  return (
    <div className={compact ? 'text-[11px] leading-tight select-none' : 'text-xs select-none'}>
      {/* 盘口表头 */}
      <div className="grid grid-cols-2 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        <span>{t('trade.price')} ({quoteCoin})</span>
        <span className="text-right">{t('trade.amount')} ({baseCoin})</span>
      </div>

      {/* 卖盘 (Asks - 红色卖单，价格由高到低靠近市价) */}
      {mode !== 'bids' && (
        <ul className="space-y-[1px]">
          {askRows.map((r, i) => (
            <li
              key={`a-${i}`}
              className={`relative grid grid-cols-2 overflow-hidden num items-center ${compact ? 'py-[2px]' : 'py-1'} font-medium rounded-[3px]`}
            >
              {r && (
                <span
                  className="absolute bottom-0 right-0 top-0 bg-gradient-to-l from-rose-500/15 via-rose-500/6 to-transparent pointer-events-none transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(4, r.pct))}%` }}
                />
              )}
              <span className="relative text-[#FF4D4F] font-semibold tabular-nums text-[11px]">
                {r ? fmt(r.price) : '--'}
              </span>
              <span className="relative text-right text-slate-600 font-medium tabular-nums text-[11px]">
                {r ? fmtAmount(r.amount) : '--'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* 最新市价栏 (Prominent Central Price Hub) */}
      <div className="my-1.5 py-1.5 border-y border-slate-100 bg-slate-50/70 rounded-lg px-2">
        <div className={`flex items-center justify-between ${
          isUp ? 'text-[#00B578]' : 'text-[#FF4D4F]'
        }`}>
          <div className="flex items-center gap-1">
            <span className={`${compact ? 'text-[14px]' : 'text-base'} font-black leading-none tabular-nums`}>
              {isFinite(price) && price > 0 ? fmt(price) : '--'}
            </span>
            <span className="text-xs font-bold leading-none">{isUp ? '↑' : '↓'}</span>
          </div>
          {change !== undefined && Number.isFinite(change) && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              isUp 
                ? 'bg-emerald-50 text-[#00B578]' 
                : 'bg-rose-50 text-[#FF4D4F]'
            }`}>
              {formatChangePercent(change, changePrecision)}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-400 font-medium num">
          <span>≈ ${isFinite(price) && price > 0 ? fmt(price) : '--'}</span>
          <span className="text-[9px] uppercase tracking-wider text-slate-400">INDEX</span>
        </div>
      </div>

      {/* 买盘 (Bids - 绿色买单，价格由高到低递减) */}
      {mode !== 'asks' && (
        <ul className="space-y-[1px]">
          {bidRows.map((r, i) => (
            <li
              key={`b-${i}`}
              className={`relative grid grid-cols-2 overflow-hidden num items-center ${compact ? 'py-[2px]' : 'py-1'} font-medium rounded-[3px]`}
            >
              {r && (
                <span
                  className="absolute bottom-0 right-0 top-0 bg-gradient-to-l from-emerald-500/15 via-emerald-500/6 to-transparent pointer-events-none transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(4, r.pct))}%` }}
                />
              )}
              <span className="relative text-[#00B578] font-semibold tabular-nums text-[11px]">
                {r ? fmt(r.price) : '--'}
              </span>
              <span className="relative text-right text-slate-600 font-medium tabular-nums text-[11px]">
                {r ? fmtAmount(r.amount) : '--'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
