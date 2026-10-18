import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, ChevronDown, ChevronLeft, SlidersHorizontal, Star } from 'lucide-react';
import KLineChart from './KLineChart';
import SymbolDrawer from './SymbolDrawer';
import {
  fetchDepth,
  fetchLatestTrades,
  fetchStats24h,
  fetchSymbols,
  fetchTick,
  type QuoteDepth,
  type QuoteStats24h,
  type QuoteTrade,
  type SymbolRow,
} from '@/api/quote';
import { subscribeQuote } from '@/api/quoteWS';
import { formatChangePercent } from '@/utils/number';
import { KLINE_PERIODS, normalizeKlinePeriodForApi, type KlinePeriod } from './klinePeriods';
import { useResponsive } from '@/hooks/useResponsive';
import { PcContainer } from '@/components/pc';
import { useFavoriteSymbols } from '@/hooks/useFavoriteSymbols';
import { useMarketStore } from '@/store/marketStore';
import { toast } from '@/components/Toast';
import { buildKlinePath, buildTradePagePath, isViewOnlySpot } from '@/utils/market';

const ORDER_TABS = ['orderBook', 'depth', 'trades'] as const;
const MAIN_INDICATORS = ['MA', 'EMA', 'BOLL', 'NONE'] as const;
const SUB_INDICATORS = ['VOL', 'MACD', 'RSI', 'NONE'] as const;

function fmt(n: number | string | undefined, precision = 2) {
  const v = Number(n);
  if (!isFinite(v)) return '--';
  return v.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

function compact(n: number | string | undefined) {
  const v = Number(n);
  if (!isFinite(v)) return '--';
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(2)}K`;
  return v.toFixed(2);
}

export default function KlinePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isPc } = useResponsive();
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type');
  const symbolParam = searchParams.get('symbol')?.toUpperCase();
  const codeParam = searchParams.get('code');
  const categoryParam = searchParams.get('category') || 'crypto';
  const scopeParam = searchParams.get('scope') === 'all' ? 'all' : 'active';
  const tradeType = typeParam === 'option' || typeParam === 'perp' ? typeParam : 'spot';
  const tradeLabel = tradeType === 'option' ? t('nav.option') : tradeType === 'perp' ? t('nav.perp') : t('nav.trade');

  const [symbols, setSymbols] = useState<SymbolRow[]>([]);
  const [current, setCurrent] = useState<SymbolRow | null>(null);
  const [period, setPeriod] = useState<KlinePeriod>('5m');
  const [price, setPrice] = useState('');
  const [change, setChange] = useState(0);
  const [depth, setDepth] = useState<QuoteDepth | null>(null);
  const [stats24h, setStats24h] = useState<QuoteStats24h | null>(null);
  const [latestTrades, setLatestTrades] = useState<QuoteTrade[]>([]);
  const [tab, setTab] = useState<(typeof ORDER_TABS)[number]>('orderBook');
  const [mainIndicator, setMainIndicator] = useState<'MA' | 'EMA' | 'BOLL' | 'NONE'>('MA');
  const [subIndicator, setSubIndicator] = useState<'VOL' | 'MACD' | 'RSI' | 'NONE'>('VOL');
  const [showIndicatorsBar, setShowIndicatorsBar] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { toggleFavorite, isFavorite } = useFavoriteSymbols();
  const getSymbols = useMarketStore((state) => state.getSymbols);

  useEffect(() => {
    getSymbols(tradeType, categoryParam, scopeParam).then((rows) => {
      const list = rows ?? [];
      setSymbols(list);
      const matched = list.find(
        (item) =>
          item.alltickCode === codeParam ||
          item.symbol.toUpperCase() === symbolParam ||
          `${item.baseCoin}/${item.quoteCoin}`.toUpperCase() === symbolParam
      );
      setCurrent(matched ?? list[0] ?? null);
    });
  }, [categoryParam, codeParam, getSymbols, scopeParam, symbolParam, tradeType]);

  const handleFavoriteToggle = () => {
    if (!current?.alltickCode) return;
    const favorited = toggleFavorite(current.alltickCode);
    toast.success(favorited ? t('market.favoriteAdded', '已加入收藏') : t('market.favoriteRemoved', '已取消收藏'));
  };

  const code = current?.alltickCode;
  const baseCoin = current?.baseCoin ?? 'BTC';
  const quoteCoin = current?.quoteCoin ?? 'USDT';
  const precision = current?.pricePrecision ?? 2;
  const showPeriod = normalizeKlinePeriodForApi(period);
  const priceNum = Number(price || current?.price);
  const viewOnlySpot = isViewOnlySpot(current);

  useEffect(() => {
    if (!current) return;
    setPrice(current.price ?? '');
    setChange(Number(current.change ?? 0));
  }, [current]);

  useEffect(() => {
    if (!code) return;
    let off: (() => void) | undefined;
    const refreshTick = () => {
      fetchTick(code)
        .then((tick) => {
          if (tick?.price) setPrice(tick.price);
          if (tick?.change !== undefined) setChange(Number(tick.change));
        })
        .catch(() => undefined);
    };
    refreshTick();
    if (current?.subscribeEnabled === 1) {
      off = subscribeQuote([code], (tick) => {
        if (tick.symbol !== code) return;
        setPrice(tick.price);
        setChange(Number(tick.change));
      });
      return off;
    }
    const timer = window.setInterval(refreshTick, 5000);
    return () => window.clearInterval(timer);
  }, [code, current?.subscribeEnabled]);

  useEffect(() => {
    if (!code) return;
    const loadMarketDetail = () => {
      fetchDepth(code).then(setDepth).catch(() => setDepth(null));
      fetchStats24h(code).then(setStats24h).catch(() => setStats24h(null));
      fetchLatestTrades(code, 30).then((rows) => setLatestTrades(rows ?? [])).catch(() => setLatestTrades([]));
    };
    loadMarketDetail();
    const timer = window.setInterval(loadMarketDetail, 5000);
    return () => window.clearInterval(timer);
  }, [code]);

  const stats = useMemo(() => {
    const volume = Number(stats24h?.volume ?? current?.volume);
    const amount = Number(stats24h?.amount);
    return {
      high: stats24h?.high,
      low: stats24h?.low,
      volume,
      amount,
    };
  }, [current?.volume, stats24h]);

  const depthRows = useMemo(() => buildDepthRows(depth), [depth]);

  // PC 端视图
  if (isPc) {
    return (
      <div className="bg-bg py-6 text-text">
        <PcContainer>
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} aria-label="back" className="rounded-lg p-1.5 hover:bg-bgSection transition">
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-bgSection transition"
              >
                <span className="text-[24px] font-bold leading-none">{baseCoin}/{quoteCoin}</span>
                <span className="rounded bg-primary/10 px-2 py-0.5 text-[12px] font-semibold text-primary">{tradeLabel}</span>
                <ChevronDown size={18} className="text-textSub" />
              </button>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className={`pc-price text-[24px] font-bold ${change >= 0 ? 'pc-up-text' : 'pc-down-text'}`}>
                  {fmt(priceNum, precision)}
                </div>
                <div className="flex items-center justify-end gap-2 text-[13px]">
                  <span className="text-textSubPc">≈ ¥{fmt(priceNum * 7.24, 2)}</span>
                  <span className={`font-semibold ${change >= 0 ? 'pc-up-text' : 'pc-down-text'}`}>
                    {formatChangePercent(change, current?.changePrecision)}
                  </span>
                </div>
              </div>
              <button
                onClick={handleFavoriteToggle}
                aria-label="favorite"
                className="rounded-lg p-2 text-textSub hover:bg-bgSection transition"
              >
                <Star size={22} className={isFavorite(current?.alltickCode) ? 'text-amber-400 fill-amber-400' : ''} />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-4 rounded-xl border border-line bg-card p-3 text-[13px]">
            <Stat label={t('kline.high24h')} value={fmt(stats.high, precision)} className="pc-up-text" />
            <Stat label={t('kline.low24h')} value={fmt(stats.low, precision)} className="pc-down-text" />
            <Stat label={t('kline.volume24h')} value={compact(stats.volume)} />
            <Stat label={t('kline.amount24h')} value={compact(stats.amount)} />
          </div>

          <div className="mt-4 grid grid-cols-[1fr_360px] gap-4">
            <section className="rounded-xl border border-line bg-card shadow-xs">
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-[13px]">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                  {KLINE_PERIODS.map((it) => (
                    <button
                      key={it.v}
                      onClick={() => setPeriod(it.v)}
                      className={`relative px-2.5 py-1 font-medium transition ${
                        period === it.v ? 'font-bold text-primary' : 'text-textSubPc hover:text-text'
                      }`}
                    >
                      {t(it.labelKey)}
                      {period === it.v && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-4 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-[12px]">
                  <span className="text-textSubPc text-[11px] mr-1">主图:</span>
                  {MAIN_INDICATORS.map((name) => (
                    <button
                      key={name}
                      onClick={() => setMainIndicator(name)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                        mainIndicator === name ? 'bg-primary/10 text-primary font-bold' : 'text-textSubPc hover:text-text'
                      }`}
                    >
                      {name === 'NONE' ? '隐藏' : name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[560px]">
                <KLineChart
                  alltickCode={code ?? ''}
                  period={showPeriod}
                  livePrice={price}
                  height={560}
                  mainIndicator={mainIndicator}
                />
              </div>
            </section>

            <section className="rounded-xl border border-line bg-card shadow-xs">
              <div className="flex gap-6 border-b border-line px-4 py-3 text-[13px]">
                {ORDER_TABS.map((name) => (
                  <button
                    key={name}
                    onClick={() => setTab(name)}
                    className={`pb-1 transition ${
                      tab === name ? 'border-b-2 border-primary font-bold text-text' : 'text-textSubPc hover:text-text'
                    }`}
                  >
                    {t(`kline.${name}`)}
                  </button>
                ))}
              </div>
              <div className="max-h-[560px] overflow-y-auto">
                {tab === 'orderBook' && (
                  <OrderBookTable rows={depthRows.slice(0, 16)} precision={precision} baseCoin={baseCoin} quoteCoin={quoteCoin} />
                )}
                {tab === 'depth' && <DepthChart rows={depthRows} precision={precision} />}
                {tab === 'trades' && <TradeTape trades={latestTrades} precision={precision} />}
              </div>
            </section>
          </div>
        </PcContainer>
        <SymbolDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onPick={(row) => {
            setCurrent(row);
            setDrawerOpen(false);
          }}
          tradeType={tradeType}
        />
      </div>
    );
  }

  // 移动端视图 (Mobile View)
  return (
    <div className="mx-auto min-h-screen max-w-md bg-card pb-24 text-text">
      {/* 1. 顶部导航栏 */}
      <header className="sticky top-0 z-30 flex h-13 items-center justify-between border-b border-line bg-card/95 px-3 backdrop-blur">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(-1)}
            aria-label="back"
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-bgSection active:scale-95 transition"
          >
            <ChevronLeft size={24} className="text-text" />
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-bgSection active:scale-98 transition"
          >
            <span className="text-[17px] font-bold text-text tracking-tight">{baseCoin}/{quoteCoin}</span>
            <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 leading-none">
              {tradeLabel}
            </span>
            <ChevronDown size={15} className="text-textSub" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleFavoriteToggle}
            aria-label="favorite"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-textSub hover:bg-bgSection active:scale-90 transition"
          >
            <Star size={19} className={isFavorite(current?.alltickCode) ? 'text-amber-400 fill-amber-400' : 'text-textSub'} />
          </button>
          <button
            onClick={() => setShowIndicatorsBar(!showIndicatorsBar)}
            aria-label="indicators"
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
              showIndicatorsBar ? 'bg-primary/10 text-primary' : 'text-textSub hover:bg-bgSection'
            }`}
          >
            <SlidersHorizontal size={17} />
          </button>
        </div>
      </header>

      {/* 2. 核心价格与 24H 行情看板 */}
      <section className="grid grid-cols-[1.18fr_1fr] items-center gap-2 px-4 py-3 bg-card">
        <div>
          <div className={`text-[28px] font-extrabold tracking-tight leading-none num tabular-nums ${change >= 0 ? 'text-up' : 'text-down'}`}>
            {fmt(priceNum, precision)}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[12px] font-medium text-textSub num tabular-nums">
              ≈ ¥{fmt(priceNum * 7.24, 2)}
            </span>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold num tabular-nums ${
                change >= 0 ? 'bg-upBg text-up' : 'bg-downBg text-down'
              }`}
            >
              {formatChangePercent(change, current?.changePrecision)}
            </span>
          </div>
        </div>

        {/* 2x2 规整指标网格 */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
          <div>
            <div className="text-[10px] text-textSub">{t('kline.high24h', '24H高')}</div>
            <div className="font-semibold text-up num tabular-nums leading-tight">{fmt(stats.high, precision)}</div>
          </div>
          <div>
            <div className="text-[10px] text-textSub">24H额(USDT)</div>
            <div className="font-semibold text-text num tabular-nums leading-tight">{compact(stats.amount)}</div>
          </div>
          <div>
            <div className="text-[10px] text-textSub">{t('kline.low24h', '24H低')}</div>
            <div className="font-semibold text-down num tabular-nums leading-tight">{fmt(stats.low, precision)}</div>
          </div>
          <div>
            <div className="text-[10px] text-textSub">24H量({baseCoin})</div>
            <div className="font-semibold text-text num tabular-nums leading-tight">{compact(stats.volume)}</div>
          </div>
        </div>
      </section>

      {/* 3. K 线周期选择工具栏 */}
      <section className="border-t border-line bg-card">
        <div className="flex items-center justify-between px-3 py-1 text-[13px]">
          <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
            {KLINE_PERIODS.map((it) => {
              const isActive = period === it.v;
              return (
                <button
                  key={it.v}
                  onClick={() => setPeriod(it.v)}
                  className={`relative shrink-0 px-2 py-1 text-[13px] transition ${
                    isActive ? 'font-bold text-primary' : 'text-textSub hover:text-text'
                  }`}
                >
                  {t(it.labelKey)}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2.5px] w-3.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 可折叠的技术指标快捷选择栏 */}
        {showIndicatorsBar && (
          <div className="flex items-center justify-between border-t border-line/60 bg-bgSection/40 px-3 py-1.5 text-[11px] animate-fadeIn">
            <div className="flex items-center gap-1.5">
              <span className="text-textSub font-medium text-[10px]">主图</span>
              {MAIN_INDICATORS.map((name) => (
                <button
                  key={name}
                  onClick={() => setMainIndicator(name)}
                  className={`px-2 py-0.5 rounded transition ${
                    mainIndicator === name
                      ? 'bg-primary text-white font-semibold shadow-xs'
                      : 'bg-card text-textSub hover:text-text border border-line'
                  }`}
                >
                  {name === 'NONE' ? '隐藏' : name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-textSub font-medium text-[10px]">副图</span>
              {SUB_INDICATORS.map((name) => (
                <button
                  key={name}
                  onClick={() => setSubIndicator(name)}
                  className={`px-2 py-0.5 rounded transition ${
                    subIndicator === name
                      ? 'bg-primary text-white font-semibold shadow-xs'
                      : 'bg-card text-textSub hover:text-text border border-line'
                  }`}
                >
                  {name === 'NONE' ? '隐藏' : name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. K 线图表主体 */}
        <div className="relative h-[390px] overflow-hidden bg-card">
          <KLineChart
            alltickCode={code ?? ''}
            period={showPeriod}
            livePrice={price}
            height={390}
            mainIndicator={mainIndicator}
          />
        </div>

        {/* 底部常用指标快速切换栏 */}
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-none whitespace-nowrap border-t border-line px-3 py-1.5 text-[11px]">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-textSub font-semibold uppercase tracking-wider">主图</span>
            {MAIN_INDICATORS.map((name) => (
              <button
                key={name}
                onClick={() => setMainIndicator(name)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  mainIndicator === name
                    ? 'bg-primary/15 text-primary font-bold'
                    : 'text-textSub hover:text-text'
                }`}
              >
                {name === 'NONE' ? '隐藏' : name}
              </button>
            ))}
          </div>
          <span className="h-3 w-px bg-line shrink-0" />
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-textSub font-semibold uppercase tracking-wider">副图</span>
            {SUB_INDICATORS.map((name) => (
              <button
                key={name}
                onClick={() => setSubIndicator(name)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  subIndicator === name
                    ? 'bg-primary/15 text-primary font-bold'
                    : 'text-textSub hover:text-text'
                }`}
              >
                {name === 'NONE' ? '隐藏' : name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 5. 委托订单 / 深度 / 最新成交 */}
      <section className="mt-2 border-t border-line bg-card">
        <div className="flex gap-6 border-b border-line px-4 text-[13px]">
          {ORDER_TABS.map((name) => (
            <button
              key={name}
              onClick={() => setTab(name)}
              className={`py-2.5 transition ${
                tab === name ? 'border-b-2 border-primary font-bold text-text' : 'text-textSub hover:text-text'
              }`}
            >
              {t(`kline.${name}`)}
            </button>
          ))}
        </div>
        <div className="pt-1">
          {tab === 'orderBook' && (
            <OrderBookTable rows={depthRows.slice(0, 8)} precision={precision} baseCoin={baseCoin} quoteCoin={quoteCoin} />
          )}
          {tab === 'depth' && <DepthChart rows={depthRows} precision={precision} />}
          {tab === 'trades' && <TradeTape trades={latestTrades} precision={precision} />}
        </div>
      </section>

      {/* 6. 底部交易所标准双向操作栏 */}
      <BottomActionBar
        tradeType={tradeType}
        current={current}
        viewOnlySpot={viewOnlySpot}
        fallbackCategory={categoryParam}
        isFav={isFavorite(current?.alltickCode)}
        onToggleFav={handleFavoriteToggle}
      />

      {/* 币种选择抽屉 */}
      <SymbolDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onPick={(row) => {
          setCurrent(row);
          setDrawerOpen(false);
        }}
        tradeType={tradeType}
      />
    </div>
  );
}

function Stat({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-textSubPc">{label}</span>
      <span className={`font-semibold num ${className}`}>{value}</span>
    </div>
  );
}

type DepthRow = {
  buyAmount?: number;
  buyPrice?: number;
  sellPrice?: number;
  sellAmount?: number;
  buyPct: number;
  sellPct: number;
};

function buildDepthRows(depth: QuoteDepth | null): DepthRow[] {
  const bids = depth?.bids ?? [];
  const asks = depth?.asks ?? [];
  const max = Math.max(
    0,
    ...bids.map((row) => Number(row.volume)).filter(Number.isFinite),
    ...asks.map((row) => Number(row.volume)).filter(Number.isFinite)
  );
  return Array.from({ length: Math.max(bids.length, asks.length) }, (_, i) => {
    const bid = bids[i];
    const ask = asks[i];
    const buyAmount = bid ? Number(bid.volume) : undefined;
    const sellAmount = ask ? Number(ask.volume) : undefined;
    return {
      buyAmount,
      buyPrice: bid ? Number(bid.price) : undefined,
      sellPrice: ask ? Number(ask.price) : undefined,
      sellAmount,
      buyPct: max > 0 && buyAmount ? Math.min(100, Math.max(8, (buyAmount / max) * 100)) : 0,
      sellPct: max > 0 && sellAmount ? Math.min(100, Math.max(8, (sellAmount / max) * 100)) : 0,
    };
  });
}

function OrderBookTable({
  rows,
  precision,
  baseCoin,
  quoteCoin,
}: {
  rows: DepthRow[];
  precision: number;
  baseCoin: string;
  quoteCoin: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="px-3 pb-4 text-xs">
      {/* 盘口表头：左买盘 右卖盘 */}
      <div className="grid grid-cols-2 gap-3 py-1.5 text-[11px] text-textSub font-medium border-b border-line/60">
        <div className="flex justify-between items-center px-1">
          <span>{t('trade.buyAmount', '买量')} ({baseCoin})</span>
          <span>{t('trade.buyPrice', '买价')} ({quoteCoin})</span>
        </div>
        <div className="flex justify-between items-center px-1">
          <span>{t('trade.sellPrice', '卖价')} ({quoteCoin})</span>
          <span className="text-right">{t('trade.sellAmount', '卖量')} ({baseCoin})</span>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-textSub">{t('common.noData', '暂无深度数据')}</div>
      ) : (
        <div className="space-y-1 pt-1.5">
          {rows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-3 text-[12px] font-mono tabular-nums">
              {/* 买盘 (Bids) */}
              <div className="relative flex justify-between items-center px-1 py-0.5 rounded overflow-hidden">
                {row.buyPct > 0 && (
                  <div
                    className="pointer-events-none absolute right-0 top-0 bottom-0 bg-emerald-500/12 rounded-l"
                    style={{ width: `${row.buyPct}%` }}
                  />
                )}
                <span className="relative text-text font-medium">
                  {row.buyAmount !== undefined ? row.buyAmount.toFixed(4) : '--'}
                </span>
                <span className="relative text-up font-bold">
                  {row.buyPrice !== undefined ? fmt(row.buyPrice, precision) : '--'}
                </span>
              </div>

              {/* 卖盘 (Asks) */}
              <div className="relative flex justify-between items-center px-1 py-0.5 rounded overflow-hidden">
                {row.sellPct > 0 && (
                  <div
                    className="pointer-events-none absolute left-0 top-0 bottom-0 bg-rose-500/12 rounded-r"
                    style={{ width: `${row.sellPct}%` }}
                  />
                )}
                <span className="relative text-down font-bold">
                  {row.sellPrice !== undefined ? fmt(row.sellPrice, precision) : '--'}
                </span>
                <span className="relative text-text font-medium text-right">
                  {row.sellAmount !== undefined ? row.sellAmount.toFixed(4) : '--'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DepthChart({ rows, precision }: { rows: DepthRow[]; precision: number }) {
  const { t } = useTranslation();
  return (
    <div className="px-4 pb-6 text-xs">
      <div className="mb-2 grid grid-cols-3 text-textSub text-[11px]">
        <span>{t('kline.buy')}</span>
        <span className="text-center">{t('kline.buySell')}</span>
        <span className="text-right">{t('kline.sell')}</span>
      </div>
      {rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-textSub">{t('common.noData')}</div>
      ) : (
        <div className="space-y-1">
          {rows.map((row, idx) => (
            <div key={idx} className="relative grid h-[28px] grid-cols-[1fr_1.2fr_1fr] items-center text-[11px] num tabular-nums">
              {row.buyPct > 0 && <span className="absolute bottom-0 left-0 top-0 bg-upBg" style={{ width: `${row.buyPct / 2}%` }} />}
              {row.sellPct > 0 && <span className="absolute bottom-0 right-0 top-0 bg-downBg" style={{ width: `${row.sellPct / 2}%` }} />}
              <span className="relative">{row.buyAmount !== undefined ? row.buyAmount.toFixed(4) : '--'}</span>
              <span className="relative text-center">
                <span className="text-up mr-1">{row.buyPrice !== undefined ? fmt(row.buyPrice, precision) : '--'}</span>
                <span className="text-down">{row.sellPrice !== undefined ? fmt(row.sellPrice, precision) : '--'}</span>
              </span>
              <span className="relative text-right">{row.sellAmount !== undefined ? row.sellAmount.toFixed(4) : '--'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TradeTape({ trades, precision }: { trades: QuoteTrade[]; precision: number }) {
  const { t } = useTranslation();
  return (
    <div className="px-4 pb-6 text-xs">
      <div className="grid grid-cols-3 py-2 text-textSub text-[11px] font-medium">
        <span>{t('kline.price')}</span>
        <span className="text-right">{t('kline.amount')}</span>
        <span className="text-right">{t('kline.time')}</span>
      </div>
      {trades.length === 0 ? (
        <div className="py-8 text-center text-sm text-textSub">{t('common.noData')}</div>
      ) : (
        <div className="space-y-1.5">
          {trades.map((trade, idx) => (
            <div key={idx} className="grid grid-cols-3 num tabular-nums text-[12px]">
              <span className={`font-semibold ${trade.side === 'buy' ? 'text-up' : 'text-down'}`}>
                {fmt(trade.price, precision)}
              </span>
              <span className="text-right text-text font-medium">{fmt(trade.volume, 4)}</span>
              <span className="text-right text-textSub text-[11px]">{formatTradeTime(trade.ts)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTradeTime(ts: number) {
  if (!Number.isFinite(ts)) return '--';
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
}

function BottomActionBar({
  tradeType,
  current,
  viewOnlySpot,
  fallbackCategory,
  isFav,
  onToggleFav,
}: {
  tradeType: 'spot' | 'option' | 'perp';
  current: SymbolRow | null;
  viewOnlySpot: boolean;
  fallbackCategory: string;
  isFav: boolean;
  onToggleFav: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const baseCoin = current?.baseCoin ?? 'BTC';
  const quoteCoin = current?.quoteCoin ?? 'USDT';

  const goToTrade = (side: 'buy' | 'sell') => {
    if (viewOnlySpot) {
      toast.info(t('market.limitedViewOnly', '当前外汇/受限现货仅支持查看行情，暂不支持完整下单交易'));
      return;
    }
    if (tradeType === 'perp') {
      navigate(`/perp?symbol=${baseCoin}/${quoteCoin}&side=${side}`);
    } else if (tradeType === 'option') {
      navigate(`/option?symbol=${baseCoin}/${quoteCoin}&side=${side}`);
    } else {
      navigate(`/trade?symbol=${baseCoin}/${quoteCoin}&side=${side}`);
    }
  };

  const buyLabel = tradeType === 'perp' ? '买入 / 做多' : tradeType === 'option' ? '买涨 (Call)' : `买入 ${baseCoin}`;
  const sellLabel = tradeType === 'perp' ? '卖出 / 做空' : tradeType === 'option' ? '买跌 (Put)' : `卖出 ${baseCoin}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-card/98 px-4 py-2 pb-safe backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="mx-auto flex max-w-md items-center gap-3">
        {/* 快捷图标组 */}
        <button
          onClick={onToggleFav}
          aria-label="favorite"
          className="flex h-11 w-11 flex-col items-center justify-center rounded-xl text-textSub hover:bg-bgSection active:scale-95 transition"
        >
          <Star size={18} className={isFav ? 'text-amber-400 fill-amber-400' : 'text-textSub'} />
          <span className="text-[10px] mt-0.5 text-textSub">{t('kline.favorite', '自选')}</span>
        </button>

        <button
          onClick={() => toast.info('已开启价格波动预警通知')}
          aria-label="alert"
          className="flex h-11 w-11 flex-col items-center justify-center rounded-xl text-textSub hover:bg-bgSection active:scale-95 transition"
        >
          <Bell size={18} className="text-textSub" />
          <span className="text-[10px] mt-0.5 text-textSub">{t('kline.alert', '提醒')}</span>
        </button>

        {/* 核心买入 / 卖出按钮组 */}
        <div className="flex flex-1 items-center gap-2.5">
          <button
            onClick={() => goToTrade('buy')}
            className="flex-1 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition flex items-center justify-center text-white font-bold text-[14px] shadow-sm"
          >
            {buyLabel}
          </button>
          <button
            onClick={() => goToTrade('sell')}
            className="flex-1 h-11 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-[0.98] transition flex items-center justify-center text-white font-bold text-[14px] shadow-sm"
          >
            {sellLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
