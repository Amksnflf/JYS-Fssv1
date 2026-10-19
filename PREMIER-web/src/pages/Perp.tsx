import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronDown,
  FileText,
  Info,
  Minus,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  SlidersHorizontal,
  WalletCards,
  X,
} from 'lucide-react';
import {
  fetchDepth,
  fetchStats24h,
  fetchSymbols,
  fetchTick,
  type QuoteDepth,
  type QuoteStats24h,
  type SymbolRow,
} from '@/api/quote';
import { subscribeQuote } from '@/api/quoteWS';
import { fetchOverview } from '@/api/asset';
import {
  closePerp,
  fetchHistoryPositions,
  fetchMyPerpOrders,
  fetchMyPositions,
  openPerp,
  type PerpHistoryPosition,
  type PerpOrder,
  type PositionVO,
} from '@/api/perp';
import { useUserStore } from '@/store/userStore';
import { toast } from '@/components/Toast';
import { useWalletModal } from '@/hooks/useWalletModal';
import { PairCoinIcon } from '@/components/AsterUI';
import KLineChart from './trade/KLineChart';
import Orderbook from './trade/Orderbook';
import PcMarketMoves from './trade/PcMarketMoves';
import SymbolDrawer from './trade/SymbolDrawer';
import { KLINE_PERIODS, normalizeKlinePeriodForApi } from './trade/klinePeriods';
import { useResponsive } from '@/hooks/useResponsive';
import { useFavoriteSymbols } from '@/hooks/useFavoriteSymbols';
import { useMarketStore } from '@/store/marketStore';

const QUICK_LEVERAGES = [1, 3, 5, 10, 30];
const BOTTOM_TABS = ['orders', 'positions'] as const;
const HISTORY_TABS = ['positions', 'historyPositions'] as const;
type AmountUnit = 'contracts' | 'quote';
type PcMarketTab = 'favorite' | 'spot' | 'perp' | 'option';

function formatPrice(p: number | undefined, precision = 2): string {
  if (p === undefined || !isFinite(p)) return '--';
  return p.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

export default function PerpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isPc } = useResponsive();
  const [searchParams] = useSearchParams();
  const token = useUserStore((s) => s.token);
  const { openWalletModal } = useWalletModal();
  const symbolParam = searchParams.get('symbol')?.toUpperCase();
  const codeParam = searchParams.get('code');
  const categoryParam = searchParams.get('category') || 'crypto';
  const sideParam = searchParams.get('side')?.toLowerCase();

  const [symbols, setSymbols] = useState<SymbolRow[]>([]);
  const [current, setCurrent] = useState<SymbolRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pcMarketTab, setPcMarketTab] = useState<PcMarketTab>('perp');
  const [pcKeyword, setPcKeyword] = useState('');

  const [period, setPeriod] = useState('5m');
  // 首次进入默认打开图表，并持久化存储用户的展开/收起选择
  const [chartVisible, setChartVisible] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('coinex_perp_chart_visible');
      if (saved !== null) return saved === 'true';
    }
    return true; // 首次进入默认打开图表
  });

  const toggleChartVisible = () => {
    setChartVisible((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('coinex_perp_chart_visible', String(next));
      }
      return next;
    });
  };
  const [livePrice, setLivePrice] = useState<string | null>(null);
  const [change, setChange] = useState(0);
  const [depth, setDepth] = useState<QuoteDepth | null>(null);
  const [stats24h, setStats24h] = useState<QuoteStats24h | null>(null);

  const [side, setSide] = useState<1 | 2>(() =>
    sideParam === 'sell' || sideParam === 'short' || sideParam === '2' ? 2 : 1
  );
  useEffect(() => {
    if (sideParam === 'sell' || sideParam === 'short' || sideParam === '2') {
      setSide(2);
    } else if (sideParam === 'buy' || sideParam === 'long' || sideParam === '1') {
      setSide(1);
    }
  }, [sideParam]);
  const [orderType, setOrderType] = useState<1 | 2>(2);
  const [marginMode, setMarginMode] = useState<1 | 2>(1);
  const [leverage, setLeverage] = useState(1);
  const [leverageDraft, setLeverageDraft] = useState('1');
  const [priceInput, setPriceInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [amountUnit, setAmountUnit] = useState<AmountUnit>('contracts');
  const [tpInput, setTpInput] = useState('');
  const [slInput, setSlInput] = useState('');
  const [tpSlEnabled, setTpSlEnabled] = useState(false);
  const [percent, setPercent] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [marginSheetOpen, setMarginSheetOpen] = useState(false);
  const [leverageSheetOpen, setLeverageSheetOpen] = useState(false);
  const [unitSheetOpen, setUnitSheetOpen] = useState(false);

  const [available, setAvailable] = useState('0');
  const [tab, setTab] = useState<(typeof BOTTOM_TABS)[number]>('positions');
  const [historyView, setHistoryView] = useState(false);
  const [historyTab, setHistoryTab] = useState<(typeof HISTORY_TABS)[number]>('positions');
  const [positions, setPositions] = useState<PositionVO[]>([]);
  const [history, setHistory] = useState<PerpHistoryPosition[]>([]);
  const [orders, setOrders] = useState<PerpOrder[]>([]);
  const [onlyCurrentSymbol, setOnlyCurrentSymbol] = useState(false);
  const { toggleFavorite, isFavorite } = useFavoriteSymbols();
  const getSymbols = useMarketStore((state) => state.getSymbols);

  // 拉交易对
  useEffect(() => {
    getSymbols('perp', categoryParam, 'active').then((d) => {
      const nextSymbols = d ?? [];
      setSymbols(nextSymbols);
      const matched = nextSymbols.find(
        (item) =>
          item.alltickCode === codeParam ||
          item.symbol.toUpperCase() === symbolParam ||
          `${item.baseCoin}/${item.quoteCoin}`.toUpperCase() === symbolParam
      );
      setCurrent(matched ?? nextSymbols[0] ?? null);
    });
  }, [categoryParam, codeParam, getSymbols, symbolParam]);

  const code = current?.alltickCode;
  const precision = current?.pricePrecision ?? 2;
  const amountPrecision = current?.amountPrecision ?? 4;
  const maxLev = current?.maxLeverage ?? 100;
  const quoteCoin = current?.quoteCoin ?? 'USDT';
  const settlementCoin = current?.settlementCoin ?? quoteCoin;

  useEffect(() => {
    if (!current) return;
    setLivePrice(current.price ?? null);
    setChange(Number(current.change ?? 0));
    setPriceInput(current.price ?? '');
    setAmountInput('');
    setPercent(0);
  }, [current?.symbol]);

  useEffect(() => {
    if (!code) return;
    const off = subscribeQuote([code], (tick) => {
      if (tick.symbol !== code) return;
      setLivePrice(tick.price);
      setChange(Number(tick.change));
    });
    fetchTick(code).then((tk) => {
      if (tk?.price) setLivePrice(tk.price);
      if (tk?.change !== undefined) setChange(Number(tk.change));
    }).catch(() => undefined);
    return off;
  }, [code]);

  useEffect(() => {
    if (!code) return;
    let alive = true;
    const load = () => {
      fetchDepth(code).then((d) => {
        if (alive) setDepth(d);
      }).catch(() => {
        if (alive) setDepth(null);
      });
      fetchStats24h(code).then((d) => {
        if (alive) setStats24h(d);
      }).catch(() => {
        if (alive) setStats24h(null);
      });
    };
    load();
    const timer = window.setInterval(load, 3000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [code]);

  const refreshAccount = () => {
    if (!token || !current) return;
    fetchOverview()
      .then((d) => {
        const acc = d?.accounts.find((a) => a.accountType === 2 && a.coin === (current.settlementCoin ?? current.quoteCoin));
        setAvailable(acc?.available ?? '0');
      })
      .catch(() => undefined);
  };

  const refreshPositions = () => {
    if (!token) return;
    fetchMyPositions().then((d) => setPositions(d ?? [])).catch(() => setPositions([]));
  };
  const refreshHistory = () => {
    if (!token) return;
    fetchHistoryPositions(1, 30)
      .then((d) => setHistory(d?.records ?? []))
      .catch(() => undefined);
  };
  const refreshOrders = () => {
    if (!token || !current) return;
    fetchMyPerpOrders(onlyCurrentSymbol ? current.symbol : undefined, 1, 30)
      .then((d) => setOrders(d?.records ?? []))
      .catch(() => undefined);
  };

  useEffect(() => {
    refreshAccount();
    refreshPositions();
    refreshHistory();
    refreshOrders();
  }, [token, current?.symbol, current?.quoteCoin, current?.settlementCoin, onlyCurrentSymbol]);

  // 持仓实时盈亏：每 3s 刷新
  useEffect(() => {
    if (!token) return;
    const t = window.setInterval(refreshPositions, 3000);
    return () => window.clearInterval(t);
  }, [token]);

  const livePriceNum = Number(livePrice ?? '0');
  const currentPrice = orderType === 2 ? livePriceNum : Number(priceInput);
  const settlementPriceNum = Number(current?.settlementPrice ?? '0');
  const quotePerSettlement = settlementPriceNum > 0 ? settlementPriceNum : 1;
  const amountAsBase = useMemo(() => {
    const amount = Number(amountInput);
    if (!isFinite(amount) || amount <= 0) return 0;
    if (amountUnit === 'quote') {
      if (!currentPrice || currentPrice <= 0) return 0;
      return amount / currentPrice;
    }
    return amount;
  }, [amountInput, amountUnit, currentPrice]);

  const onPercent = (pct: number) => {
    setPercent(pct);
    const p = currentPrice;
    if (!p || p <= 0) return;
    const usable = (Number(available) * pct) / 100;
    const notionalSettlement = usable * leverage;
    const notionalQuote = notionalSettlement * quotePerSettlement;
    setAmountInput(amountUnit === 'quote' ? notionalQuote.toFixed(2) : (notionalQuote / p).toFixed(amountPrecision));
  };

  const clampLeverage = (value: number) => {
    if (!isFinite(value) || value < 1) return 1;
    return Math.min(maxLev, Math.max(1, Math.floor(value)));
  };

  const openLeverageSheet = () => {
    setLeverageDraft(String(leverage));
    setLeverageSheetOpen(true);
  };

  const handleLeverageKey = (key: string) => {
    if (key === 'back') {
      setLeverageDraft((v) => (v.length > 1 ? v.slice(0, -1) : '1'));
      return;
    }
    setLeverageDraft((v) => {
      const next = v === '0' || v === '1' ? key : `${v}${key}`;
      return String(clampLeverage(Number(next)));
    });
  };

  const onPlace = async (placeSide: 1 | 2 = side) => {
    if (!token) {
      toast.error(t('auth.login'));
      openWalletModal();
      return;
    }
    if (!current) return;
    if (!amountAsBase || amountAsBase <= 0) {
      toast.error(t('asset.amountPlaceholder'));
      return;
    }
    setPlacing(true);
    try {
      await openPerp({
        symbol: current.symbol,
        side: placeSide,
        orderType,
        marginMode,
        leverage,
        price: orderType === 1 ? priceInput : undefined,
        amount: amountAsBase.toFixed(amountPrecision),
        takeProfitPrice: tpSlEnabled && tpInput ? tpInput : undefined,
        stopLossPrice: tpSlEnabled && slInput ? slInput : undefined,
      });
      toast.success(t('perp.openSuccess'));
      setAmountInput('');
      setTpInput('');
      setSlInput('');
      setPercent(0);
      refreshAccount();
      refreshPositions();
      refreshOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'fail');
    } finally {
      setPlacing(false);
    }
  };

  const [bookPrecisionStep, setBookPrecisionStep] = useState(0);

  const onClosePos = async (id: number) => {
    if (!window.confirm(t('perp.confirmClose'))) return;
    try {
      await closePerp(id);
      toast.success(t('perp.closeSuccess'));
      refreshAccount();
      refreshPositions();
      refreshHistory();
      refreshOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'fail');
    }
  };

  const handleBulkAction = async () => {
    if (tab === 'orders') {
      if (orders.length === 0) {
        toast.info(t('common.noData', '暂无委托单'));
        return;
      }
      refreshOrders();
      toast.info(t('perp.ordersRefreshed', '已刷新委托状态'));
      return;
    }
    if (visiblePositions.length === 0) {
      toast.info(t('perp.noPosition', '暂无持仓'));
      return;
    }
    if (!window.confirm(t('perp.confirmCloseAll', '确定一键平掉当前全部持仓？'))) return;
    try {
      for (const pos of visiblePositions) {
        await closePerp(pos.id);
      }
      toast.success(t('perp.closeSuccess'));
      refreshAccount();
      refreshPositions();
      refreshHistory();
      refreshOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'fail');
    }
  };


  const notionalPreview = useMemo(() => {
    const p = currentPrice;
    const a = amountAsBase;
    if (p <= 0 || a <= 0) return { notionalQuote: 0, marginSettlement: 0 };
    const notionalQuote = p * a;
    return {
      notionalQuote,
      marginSettlement: quotePerSettlement > 0 ? notionalQuote / quotePerSettlement / leverage : 0,
    };
  }, [currentPrice, amountAsBase, leverage, quotePerSettlement]);
  const pcSymbols = useMemo(() => {
    const keyword = pcKeyword.trim().toUpperCase();
    const rows = pcMarketTab === 'favorite' ? symbols.filter((item) => isFavorite(item.alltickCode)) : symbols;
    if (!keyword) return rows;
    return rows.filter((item) =>
      item.symbol.toUpperCase().includes(keyword) ||
      item.baseCoin.toUpperCase().includes(keyword) ||
      item.quoteCoin.toUpperCase().includes(keyword)
    );
  }, [isFavorite, pcKeyword, pcMarketTab, symbols]);
  const handleFavoriteToggle = () => {
    if (!current?.alltickCode) return;
    const favorited = toggleFavorite(current.alltickCode);
    toast.success(favorited ? t('market.favoriteAdded', '已加入收藏') : t('market.favoriteRemoved', '已取消收藏'));
  };
  const visiblePositions = useMemo(() => {
    if (!onlyCurrentSymbol || !current) return positions;
    return positions.filter((item) => item.symbol === current.symbol);
  }, [current, onlyCurrentSymbol, positions]);
  const onPcMarketTabChange = (next: PcMarketTab) => {
    if (next === 'spot' || next === 'option') {
      const params = current
        ? new URLSearchParams({
            symbol: current.symbol,
            code: current.alltickCode,
            category: current.category || categoryParam,
          })
        : null;
      navigate(`${next === 'spot' ? '/trade' : '/option'}${params ? `?${params.toString()}` : ''}`);
      return;
    }
    setPcMarketTab(next);
  };

  if (historyView) {
    return (
      <HistoryOrdersView
        active={historyTab}
        setActive={setHistoryTab}
        onBack={() => setHistoryView(false)}
        positions={positions}
        history={history}
        onClosePos={onClosePos}
        defaultQuoteCoin={settlementCoin}
      />
    );
  }

  if (isPc) {
    const baseCoin = current?.baseCoin ?? 'BTC';
    const sideUp = side === 1;
    return (
      <div className="pc-trade-shell min-w-[1351px] bg-bg text-text">
        <div className="pc-trade-header grid h-[54px] grid-cols-[220px_minmax(0,1fr)] border-b border-line bg-bg">
          <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-2 border-r border-line px-4 text-left">
            <PairCoinIcon
              baseCoin={baseCoin}
              quoteCoin={quoteCoin}
              baseLogo={current?.baseLogo}
              quoteLogo={current?.quoteLogo}
              size="sm"
            />
            <span className="text-[16px] font-semibold leading-none">{baseCoin}/{quoteCoin}</span>
            <span className="rounded bg-bgSection px-1.5 py-0.5 text-[10px] text-textSubPc">{t('nav.perp')}</span>
            <ChevronDown size={14} />
          </button>
          <div className="flex min-w-0 items-center gap-6 overflow-hidden px-4">
            <div className="shrink-0">
              <div className={`pc-price text-[20px] font-semibold leading-none ${change >= 0 ? 'pc-up-text' : 'pc-down-text'}`}>
                {formatPrice(livePriceNum, precision)}
              </div>
              <div className={`mt-1 text-[11px] ${change >= 0 ? 'pc-up-text' : 'pc-down-text'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(current?.changePrecision ?? 2)}%
              </div>
            </div>
            <PerpPcTopStat label={t('kline.markPrice')} value={formatPrice(livePriceNum, precision)} />
            <PerpPcTopStat label={t('kline.high24h')} value={formatPrice(Number(stats24h?.high), precision)} className="pc-up-text" />
            <PerpPcTopStat label={t('kline.low24h')} value={formatPrice(Number(stats24h?.low), precision)} className="pc-down-text" />
            <PerpPcTopStat label={t('kline.volume24h')} value={compactPerpNumber(stats24h?.volume)} />
            <div className="ml-auto flex shrink-0 items-center gap-4">
              <button onClick={() => setHistoryView(true)} className="text-[12px] text-textSubPc hover:text-text">{t('perp.historyOrders')}</button>
              <button onClick={handleFavoriteToggle} className="text-text" aria-label="favorite">
                <StarIcon filled={isFavorite(current?.alltickCode)} />
              </button>
            </div>
          </div>
        </div>

        <div className="pc-trade-main grid grid-cols-[220px_minmax(760px,1fr)_260px] border-b border-line">
          <PerpPcMarketList
            rows={pcSymbols}
            current={current}
            activeTab={pcMarketTab}
            keyword={pcKeyword}
            onTabChange={onPcMarketTabChange}
            onKeywordChange={setPcKeyword}
            onPick={setCurrent}
          />

          <section className="min-w-0 border-x border-line bg-bg">
            <div className="flex h-9 items-center justify-between border-b border-line px-3 text-[12px]">
              <div className="flex items-center gap-4 overflow-x-auto scrollbar-none">
                {KLINE_PERIODS.map((p) => (
                  <button
                    key={p.v}
                    onClick={() => setPeriod(p.v)}
                    className={`whitespace-nowrap transition ${period === p.v ? 'font-semibold text-text' : 'text-textSubPc hover:text-text'}`}
                  >
                    {t(p.labelKey)}
                  </button>
                ))}
                <span className="h-3 w-px shrink-0 bg-line" />
                <button className="font-semibold text-text">MA</button>
                <button className="text-textSubPc">EMA</button>
                <button className="text-textSubPc">BOLL</button>
              </div>
              <button onClick={() => navigate('/trade/kline?type=perp')} className="text-textSubPc hover:text-text" aria-label={t('trade.chart')}>
                <ChartIcon />
              </button>
            </div>
            <div className="h-[300px]">
              {code && <KLineChart alltickCode={code} period={period} livePrice={livePrice} height={300} />}
            </div>
            <div className="flex h-9 items-center gap-5 border-t border-line px-3 text-[12px] text-textSubPc">
              <button
                onClick={() => setOrderType(2)}
                className={orderType === 2 ? 'font-semibold text-text' : 'hover:text-text'}
              >
                {t('trade.marketOrder')}
              </button>
              <button
                onClick={() => setOrderType(1)}
                className={orderType === 1 ? 'font-semibold text-text' : 'hover:text-text'}
              >
                {t('trade.limitOrder')}
              </button>
              <button
                onClick={() => setTpSlEnabled((v) => !v)}
                className={tpSlEnabled ? 'font-semibold text-text' : 'hover:text-text'}
              >
                {t('perp.tpSl')}
              </button>
            </div>
            <div className="border-t border-line px-3 py-3">
              <PerpPcOrderPanel
                marginMode={marginMode}
                setMarginMode={setMarginMode}
                leverage={leverage}
                setLeverage={setLeverage}
                openLeverageSheet={openLeverageSheet}
                clampLeverage={clampLeverage}
                orderType={orderType}
                setOrderType={setOrderType}
                priceInput={priceInput}
                setPriceInput={setPriceInput}
                amountInput={amountInput}
                setAmountInput={setAmountInput}
                amountUnit={amountUnit}
                percent={percent}
                onPercent={onPercent}
                available={available}
                notionalPreview={notionalPreview}
                placing={placing}
                token={token}
                onPlace={onPlace}
                quoteCoin={quoteCoin}
                settlementCoin={settlementCoin}
              />
            </div>
          </section>

          <aside className="bg-bg">
            <div className="flex h-9 items-center justify-between border-b border-line px-3 text-[12px]">
              <span className="font-semibold text-text">{t('trade.orderbook')}</span>
              <DepthIcon />
            </div>
            <div className="h-[520px] overflow-hidden px-3 py-2">
              <div className="h-[286px] overflow-hidden">
                <Orderbook
                  price={livePriceNum}
                  precision={precision}
                  baseCoin={baseCoin}
                  quoteCoin={quoteCoin}
                  depth={depth}
                  rows={5}
                  compact
                  change={change}
                  changePrecision={current?.changePrecision}
                />
              </div>
              <div className="mt-3 border-t border-line pt-2">
                <PcMarketMoves rows={pcSymbols} />
              </div>
            </div>
          </aside>
        </div>

        <div className="pc-trade-bottom grid grid-cols-[220px_minmax(760px,1fr)_260px]">
          <section className="border-r border-line px-3 py-3 text-[12px] text-textSubPc">
            <div className="flex items-center justify-between">
              <span>{t('kline.volume24h')}</span>
              <span className="pc-price text-text">{compactPerpNumber(stats24h?.volume)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span>{t('trade.available')}</span>
              <span className="pc-price text-text">{available} {settlementCoin}</span>
            </div>
          </section>

          <section className="col-span-2 min-w-0 px-4 py-3">
            <div className="flex gap-8 border-b border-line text-[13px]">
              {BOTTOM_TABS.map((k) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`pb-3 transition ${tab === k ? 'border-b-2 border-text font-semibold text-text' : 'text-textSubPc hover:text-text'}`}
                >
                  {k === 'positions' ? `${t('perp.positions')} (${visiblePositions.length})` : `${t('perp.orders')} (${orders.length})`}
                </button>
              ))}
              <label className="ml-auto flex items-center gap-2 pb-3 text-[12px] text-textSubPc">
                <input
                  type="checkbox"
                  checked={onlyCurrentSymbol}
                  onChange={(e) => setOnlyCurrentSymbol(e.target.checked)}
                />
                {t('common.currentSymbol')}
              </label>
            </div>
            <div className="mt-3">
              {tab === 'positions' ? <PositionList positions={visiblePositions} onClosePos={onClosePos} /> : <OrderList orders={orders} />}
            </div>
          </section>

          <div className="hidden">{sideUp ? 'up' : 'down'}</div>
        </div>

        <SymbolDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onPick={(r) => setCurrent(r)} tradeType="perp" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-white pb-36 text-slate-900 md:max-w-[1180px]">
      {/* 标的行 (Symbol & Ticker Bar) */}
      <div className="flex items-center justify-between bg-white px-3 py-2">
        <div className="flex items-baseline gap-1.5">
          <button
            className="flex items-center gap-1 text-lg font-bold tracking-tight text-slate-900"
            onClick={() => setDrawerOpen(true)}
          >
            <span>{current ? `${current.baseCoin}${current.quoteCoin}` : 'BTCUSDT'}</span>
            <ChevronDown size={15} className="text-slate-500" />
          </button>
          <span className="text-[11px] font-medium text-slate-400">永续</span>
          <span
            className={`text-xs font-bold tabular-nums ${
              change >= 0 ? 'text-[#00B578]' : 'text-[#FF4D4F]'
            }`}
          >
            {change >= 0 ? '+' : ''}{change.toFixed(current?.changePrecision ?? 2)}%
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-600">
          <button
            onClick={toggleChartVisible}
            className="text-slate-600 hover:text-slate-900"
            aria-label="Toggle Chart"
          >
            <ChartIcon />
          </button>
          <button
            onClick={openLeverageSheet}
            className="text-slate-600 hover:text-slate-900"
            aria-label="Settings"
          >
            <SlidersHorizontal size={17} />
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-slate-600 hover:text-slate-900"
            aria-label="More"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* 3. 周期栏与 K 线图表 */}
      {chartVisible && (
        <div className="border-t border-slate-100 bg-white">
          <div className="flex items-center gap-2.5 overflow-x-auto px-3 py-1.5 text-xs scrollbar-none">
            {['分时', '1分', '5分', '15分', '30分', '1时', '2时', '4时'].map((lbl) => {
              const pMap: Record<string, string> = {
                '分时': '1m-line', '1分': '1m', '5分': '5m',
                '15分': '15m', '30分': '30m', '1时': '1h', '2时': '2h', '4时': '4h'
              };
              const active = pMap[lbl] ? period === pMap[lbl] : false;
              return (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => pMap[lbl] && setPeriod(pMap[lbl])}
                  className={`whitespace-nowrap px-2.5 py-0.5 rounded-full font-medium transition ${
                    active ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {lbl}
                </button>
              );
            })}
          </div>
          <div className="h-[210px] w-full">
            {code && <KLineChart alltickCode={code} period={normalizeKlinePeriodForApi(period)} livePrice={livePrice} height={210} />}
          </div>
        </div>
      )}

      {/* 4. 双栏交易核心区 (左下单表单 + 右真实深度盘口) */}
      <div className="mt-2 grid grid-cols-[60%_40%] gap-2.5 px-3 py-2 bg-white">
        {/* 左栏：合约下单表单 */}
        <section className="flex flex-col">
          {/* 全仓 / 逐仓 & 杠杆倍数 (标准金融圆角矩形按键) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMarginSheetOpen(true)}
              className="flex h-10 items-center justify-between rounded-[8px] bg-[#F5F6F8] border border-slate-200/80 px-3 text-[13px] font-semibold text-slate-800 hover:bg-slate-200/60 transition cursor-pointer"
            >
              <span>{marginMode === 1 ? t('perp.isolated') : t('perp.cross')}</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>
            <button
              type="button"
              onClick={openLeverageSheet}
              className="flex h-10 items-center justify-between rounded-[8px] bg-[#F5F6F8] border border-slate-200/80 px-3 text-[13px] font-semibold text-slate-800 hover:bg-slate-200/60 transition cursor-pointer"
            >
              <span>{leverage}x</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>
          </div>

          {/* 订单类型选择 (限价单 / 市价单) */}
          <button
            type="button"
            onClick={() => setOrderType(orderType === 1 ? 2 : 1)}
            className="mt-2 flex h-10 w-full items-center justify-between rounded-[8px] bg-[#F5F6F8] border border-slate-200/80 px-3.5 text-[13.5px] font-semibold text-slate-800 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <span>{orderType === 1 ? t('trade.limit') : t('trade.market')}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {/* 价格输入行 (限价时可输，市价时显示当前最新价) */}
          <div className="mt-1.5 flex h-9.5 items-center justify-between rounded-[8px] bg-[#F5F6F8] border border-slate-200/80 px-2.5">
            <input
              value={orderType === 2 ? formatPrice(livePriceNum, precision) : priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              readOnly={orderType === 2}
              placeholder={t('trade.price')}
              inputMode="decimal"
              className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-900 outline-none tabular-nums placeholder:text-slate-400"
            />
            <span className="text-[10.5px] font-semibold text-slate-500 shrink-0">{quoteCoin}</span>
          </div>

          {/* 数量输入行 (含单位切换) */}
          <div className="mt-1.5 flex h-9.5 items-center justify-between rounded-[8px] bg-[#F5F6F8] border border-slate-200/80 px-2.5">
            <input
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                setPercent(0);
              }}
              placeholder={t('trade.amount')}
              inputMode="decimal"
              className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-900 outline-none tabular-nums placeholder:text-slate-400"
            />
            <button
              type="button"
              className="flex shrink-0 items-center gap-0.5 text-[10.5px] font-bold text-slate-800 hover:text-slate-900 transition cursor-pointer"
              onClick={() => setUnitSheetOpen(true)}
            >
              <span>{amountUnit === 'contracts' ? t('perp.contractsUnit') : quoteCoin}</span>
              <ChevronDown size={11} className="text-slate-400" />
            </button>
          </div>

          {/* 可用余额 */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>{t('trade.available')}</span>
            <div className="flex items-center gap-1 font-semibold text-slate-800 tabular-nums">
              <span>{available} {settlementCoin}</span>
              <button
                type="button"
                onClick={refreshAccount}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Refresh available"
              >
                <RefreshCcw size={11} />
              </button>
            </div>
          </div>

          {/* 5 节点百分比仓位滑块 */}
          <div className="mt-2.5 px-0.5">
            <div className="relative flex items-center h-4 cursor-pointer">
              <div className="absolute left-0 right-0 h-[2px] bg-slate-200 rounded-[1px]" />
              <div
                className="absolute left-0 h-[2px] bg-slate-800 rounded-[1px] transition-all"
                style={{ width: `${percent}%` }}
              />
              {[0, 25, 50, 75, 100].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => onPercent(step)}
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-[1px] border transition-all ${
                    percent >= step ? 'border-slate-800 bg-slate-800' : 'border-slate-300 bg-white'
                  }`}
                  style={{ left: `${step}%` }}
                  aria-label={`${step}%`}
                />
              ))}
            </div>
            <div className="mt-0.5 grid grid-cols-5 text-[10px] text-slate-400">
              {[0, 25, 50, 75, 100].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPercent(p)}
                  className={`cursor-pointer ${p === 0 ? 'text-left' : p === 100 ? 'text-right' : 'text-center'} ${percent === p ? 'font-bold text-slate-800' : ''}`}
                >
                  {p === 0 ? '0' : `${p}%`}
                </button>
              ))}
            </div>
          </div>

          {/* 止盈止损与费率 */}
          <label className="mt-2 flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={tpSlEnabled}
              onChange={(e) => setTpSlEnabled(e.target.checked)}
              className="h-3.5 w-3.5 rounded-[2px] accent-[#00B578]"
            />
            <span className="font-medium">{t('perp.tpSl')}</span>
            <Info size={11} className="text-slate-400" />
            <span className="ml-auto font-bold text-slate-700">%</span>
            <span className="text-[11px] text-slate-500">{t('perp.feeRate')}</span>
          </label>

          {tpSlEnabled && (
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <input
                value={tpInput}
                onChange={(e) => setTpInput(e.target.value)}
                placeholder={t('perp.takeProfit')}
                inputMode="decimal"
                className="h-7 rounded-[4px] bg-[#F5F6F8] border border-slate-200/80 px-2 text-[10px] font-semibold text-slate-900 outline-none tabular-nums"
              />
              <input
                value={slInput}
                onChange={(e) => setSlInput(e.target.value)}
                placeholder={t('perp.stopLoss')}
                inputMode="decimal"
                className="h-7 rounded-[4px] bg-[#F5F6F8] border border-slate-200/80 px-2 text-[10px] font-semibold text-slate-900 outline-none tabular-nums"
              />
            </div>
          )}

          {/* 买入(做多) 按键与指标 */}
          <button
            type="button"
            disabled={placing}
            onClick={() => {
              setSide(1);
              void onPlace(1);
            }}
            className="mt-2.5 h-11 w-full rounded-full bg-[#00B578] hover:bg-[#009e69] text-[13px] font-bold text-white shadow-xs transition active:scale-[0.98] disabled:opacity-50 cursor-pointer flex flex-col items-center justify-center leading-tight"
          >
            <span>{t('perp.buyLongWithLev', { leverage })}</span>
            <span className="text-[10px] font-normal opacity-90">{t('perp.approxContracts', { amount: amountAsBase.toFixed(0) })}</span>
          </button>

          <MetricRow label={t('perp.openableContracts')} value={t('perp.approxContracts', { amount: amountAsBase.toFixed(0) }).replace('≈', '')} />
          <MetricRow label={t('perp.margin')} value={`≈ ${notionalPreview.marginSettlement.toFixed(2)} ${settlementCoin}`} />

          {/* 卖出(做空) 按键与指标 */}
          <button
            type="button"
            disabled={placing}
            onClick={() => {
              setSide(2);
              void onPlace(2);
            }}
            className="mt-2 h-11 w-full rounded-full bg-[#FF4D4F] hover:bg-[#e64244] text-[13px] font-bold text-white shadow-xs transition active:scale-[0.98] disabled:opacity-50 cursor-pointer flex flex-col items-center justify-center leading-tight"
          >
            <span>{t('perp.sellShortWithLev', { leverage })}</span>
            <span className="text-[10px] font-normal opacity-90">{t('perp.approxContracts', { amount: amountAsBase.toFixed(0) })}</span>
          </button>

          <MetricRow label={t('perp.openableContracts')} value={t('perp.approxContracts', { amount: amountAsBase.toFixed(0) }).replace('≈', '')} />
          <MetricRow label={t('perp.margin')} value={`≈ ${notionalPreview.marginSettlement.toFixed(2)} ${settlementCoin}`} />
        </section>

        {/* 右栏：真实深度盘口 */}
        <aside className="min-w-0 flex flex-col justify-between pl-1 border-l border-slate-100">
          <Orderbook
            price={livePriceNum}
            precision={precision}
            precisionStep={bookPrecisionStep}
            baseCoin={current?.baseCoin}
            quoteCoin={current?.quoteCoin}
            depth={depth}
            rows={10}
            compact
            change={change}
            changePrecision={current?.changePrecision}
          />
          <div className="mt-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setBookPrecisionStep((v) => (v >= 3 ? 0 : v + 1))}
              className="flex h-7 flex-1 items-center justify-between rounded-[4px] bg-[#F5F6F8] border border-slate-200/60 px-2 text-[10px] font-semibold text-slate-600 num cursor-pointer hover:bg-slate-200/60"
            >
              <span>{Math.pow(10, -(precision + bookPrecisionStep)).toFixed(precision + bookPrecisionStep)}</span>
              <ChevronDown size={11} className="text-slate-400" />
            </button>
          </div>
        </aside>
      </div>

      {/* 5. 底部栏目选项卡 (仓位 / 委托) */}
      <div className="mt-4 border-t border-slate-100 bg-white px-3 pt-2">
        <div className="flex items-center justify-between border-b border-slate-100">
          <div className="flex gap-6 text-xs font-medium">
            <button
              type="button"
              onClick={() => setTab('positions')}
              className={`pb-2 transition cursor-pointer ${
                tab === 'positions'
                  ? 'border-b-2 border-slate-900 font-bold text-slate-900'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('perp.position', '仓位')} ({visiblePositions.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('orders')}
              className={`pb-2 flex items-center gap-0.5 transition cursor-pointer ${
                tab === 'orders'
                  ? 'border-b-2 border-slate-900 font-bold text-slate-900'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{t('perp.orders', '当前委托')} ({orders.length})</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setHistoryView(true)}
            className="pb-2 text-slate-500 hover:text-slate-900 flex items-center gap-1 text-xs cursor-pointer"
            aria-label="History orders"
          >
            <FileText size={15} />
            <span>{t('perp.history', '历史')}</span>
          </button>
        </div>

        {/* 过滤控制栏 */}
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyCurrentSymbol}
              onChange={(e) => setOnlyCurrentSymbol(e.target.checked)}
              className="h-3.5 w-3.5 rounded-[2px] accent-[#00B578]"
            />
            <span>{t('common.currentSymbol', '当前交易对')}</span>
          </label>
          <button
            type="button"
            onClick={handleBulkAction}
            className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
          >
            {tab === 'orders' ? t('perp.bulkCancel', '全部撤单') : t('perp.closeAll', '一键全平')}
          </button>
        </div>

        {/* 列表内容区 */}
        <div className="mt-2">
          {tab === 'orders' ? (
            orders.length === 0 ? <Empty text={t('common.noData')} /> : <OrderList orders={orders} />
          ) : (
            visiblePositions.length === 0 ? <Empty text={t('perp.noPosition')} /> : <PositionList positions={visiblePositions} onClosePos={onClosePos} />
          )}
        </div>
      </div>

      <BottomSheet open={marginSheetOpen} onClose={() => setMarginSheetOpen(false)}>
        <div className="px-4 pb-8 pt-2">
          <h3 className="text-center text-base font-bold text-slate-900">{t('perp.marginMode')}</h3>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => setMarginMode(1)}
              className={`h-9 rounded-[4px] border text-xs font-bold transition ${marginMode === 1 ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
            >
              {t('perp.isolated')}
            </button>
            <button
              onClick={() => setMarginMode(2)}
              className={`h-9 rounded-[4px] border text-xs font-bold transition ${marginMode === 2 ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
            >
              {t('perp.cross')}
            </button>
          </div>
          <div className="mt-5 space-y-3 text-xs leading-5 text-slate-600">
            <p>{t('perp.marginModeTip')}</p>
            <p className="font-bold text-slate-800">{t('perp.marginModeWhat')}</p>
            <p>{t('perp.crossDesc')}</p>
            <p>{t('perp.isolatedDesc')}</p>
          </div>
          <button className="mt-5 h-10 w-full rounded-[6px] bg-slate-900 font-bold text-xs text-white" onClick={() => setMarginSheetOpen(false)}>
            {t('common.confirm')}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={leverageSheetOpen} onClose={() => setLeverageSheetOpen(false)}>
        <div className="px-4 pb-8 pt-1">
          <h3 className="text-center text-base font-bold text-slate-900">{t('perp.adjustLeverage')}</h3>
          <div className="mt-4 flex h-10 items-center rounded-[4px] bg-slate-100">
            <button className="flex h-full w-9 items-center justify-center rounded-[4px] bg-slate-200 text-slate-700" onClick={() => setLeverageDraft(String(clampLeverage(Number(leverageDraft) - 1)))}>
              <Minus size={16} />
            </button>
            <div className="flex-1 text-center text-base font-bold text-slate-900 num">{leverageDraft}</div>
            <button className="flex h-full w-9 items-center justify-center rounded-[4px] bg-slate-900 text-white" onClick={() => setLeverageDraft(String(clampLeverage(Number(leverageDraft) + 1)))}>
              <Plus size={16} />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-1 rounded-[4px] bg-slate-100 p-1">
            {QUICK_LEVERAGES.filter((l) => l <= maxLev).map((l) => (
              <button
                key={l}
                onClick={() => setLeverageDraft(String(l))}
                className={`h-8 rounded-[4px] text-xs font-semibold ${Number(leverageDraft) === l ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'}`}
              >
                {l}x
              </button>
            ))}
          </div>
          <MetricRow label={t('perp.currentMaxLeverage')} value={`${maxLev}x`} className="mt-3 text-xs" />
          <MetricRow label={t('perp.maxOpen')} value={t('perp.approxContracts', { amount: amountAsBase.toFixed(0) }).replace('≈', '')} className="text-xs" />
          <button
            className="mt-4 h-10 w-full rounded-[6px] bg-slate-900 font-bold text-xs text-white"
            onClick={() => {
              setLeverage(clampLeverage(Number(leverageDraft)));
              setLeverageSheetOpen(false);
            }}
          >
            {t('common.confirm')}
          </button>
          <NumberPad onPress={handleLeverageKey} />
        </div>
      </BottomSheet>

      <BottomSheet open={unitSheetOpen} onClose={() => setUnitSheetOpen(false)}>
        <div className="px-5 pb-8 pt-5">
          {(['contracts', 'quote'] as AmountUnit[]).map((u) => (
            <button
              key={u}
              onClick={() => {
                setAmountUnit(u);
                setAmountInput('');
                setUnitSheetOpen(false);
              }}
              className={`mb-3 flex h-12 w-full items-center rounded-[6px] px-4 text-left text-sm ${amountUnit === u ? 'bg-slate-100 font-bold text-slate-900' : 'bg-white text-slate-700 border border-slate-200'}`}
            >
              {u === 'contracts' ? t('perp.contractsUnit') : quoteCoin}
            </button>
          ))}
        </div>
      </BottomSheet>
      <SymbolDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onPick={(r) => setCurrent(r)} tradeType="perp" />
    </div>
  );
}

function TradeSelect({ children, onClick, className = '' }: { children: ReactNode; onClick: () => void; className?: string }) {
  return (
    <button className={`flex h-12 items-center justify-center rounded bg-bgSoft px-3 text-sm font-bold ${className}`} onClick={onClick}>
      {children}
      <ChevronDown size={14} className="ml-2" />
    </button>
  );
}

function MetricRow({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`mt-2 flex items-center justify-between text-sm ${className}`}>
      <span className="text-textSub">{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}

function compactPerpNumber(value: string | number | null | undefined): string {
  const n = Number(value);
  if (!isFinite(n)) return '--';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

function PerpPcTopStat({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-[100px] text-[11px] leading-[15px]">
      <div className="text-textSubPc">{label}</div>
      <div className={`pc-price font-semibold text-text ${className}`}>{value}</div>
    </div>
  );
}

function PerpPcMarketList({
  rows,
  current,
  activeTab,
  keyword,
  onTabChange,
  onKeywordChange,
  onPick,
}: {
  rows: SymbolRow[];
  current: SymbolRow | null;
  activeTab: PcMarketTab;
  keyword: string;
  onTabChange: (tab: PcMarketTab) => void;
  onKeywordChange: (value: string) => void;
  onPick: (row: SymbolRow) => void;
}) {
  const { t } = useTranslation();
  const tabs: Array<{ key: PcMarketTab; label: string }> = [
    { key: 'favorite', label: t('market.cFavorite') },
    { key: 'spot', label: t('market.cSpot') },
    { key: 'perp', label: t('market.cPerp') },
    { key: 'option', label: t('market.cOption') },
  ];
  return (
    <aside className="pc-trade-market h-[569px] overflow-hidden bg-bg">
      <div className="border-b border-line p-2">
        <label className="flex h-7 items-center gap-2 rounded bg-bgSection px-2 text-[11px] text-textSubPc">
          <span>⌕</span>
          <input
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder={t('common.search')}
            className="h-full min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-textMute"
          />
        </label>
        <div className="mt-2 flex items-center gap-4 text-[12px]">
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`pb-1 ${activeTab === item.key ? 'border-b-2 border-text font-semibold text-text' : 'text-textSubPc'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[510px] overflow-y-auto">
        <div className="grid grid-cols-[1fr_74px] px-3 py-2 text-[10px] text-textSubPc">
          <span>{t('trade.symbol')}</span>
          <span className="text-right">{t('kline.latestPrice')}</span>
        </div>
        {rows.map((row) => {
          const selected = row.symbol === current?.symbol;
          const rowChange = Number(row.change ?? 0);
          return (
            <button
              key={row.alltickCode || row.symbol}
              type="button"
              onClick={() => onPick(row)}
              className={`grid h-[45px] w-full grid-cols-[1fr_78px] items-center px-3 text-left hover:bg-bgSection ${
                selected ? 'bg-bgSection' : ''
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-text">{row.baseCoin}/{row.quoteCoin}</span>
                <span className={rowChange >= 0 ? 'pc-up-text text-[10px]' : 'pc-down-text text-[10px]'}>
                  {rowChange >= 0 ? '+' : ''}{rowChange.toFixed(row.changePrecision ?? 2)}%
                </span>
              </span>
              <span className="text-right">
                <span className="pc-price block text-[12px] font-semibold text-text">{formatPrice(Number(row.price), row.pricePrecision)}</span>
                <span className="text-[10px] text-textSubPc">{compactPerpNumber(row.volume)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function PerpPcOrderPanel({
  marginMode,
  setMarginMode,
  leverage,
  setLeverage,
  openLeverageSheet,
  clampLeverage,
  orderType,
  setOrderType,
  priceInput,
  setPriceInput,
  amountInput,
  setAmountInput,
  amountUnit,
  percent,
  onPercent,
  available,
  notionalPreview,
  placing,
  token,
  onPlace,
  quoteCoin,
  settlementCoin,
}: {
  marginMode: 1 | 2;
  setMarginMode: (value: 1 | 2) => void;
  leverage: number;
  setLeverage: (value: number) => void;
  openLeverageSheet: () => void;
  clampLeverage: (value: number) => number;
  orderType: 1 | 2;
  setOrderType: (updater: (value: 1 | 2) => 1 | 2) => void;
  priceInput: string;
  setPriceInput: (value: string) => void;
  amountInput: string;
  setAmountInput: (value: string) => void;
  amountUnit: AmountUnit;
  percent: number;
  onPercent: (value: number) => void;
  available: string;
  notionalPreview: { notionalQuote: number; marginSettlement: number };
  placing: boolean;
  token: unknown;
  onPlace: (side: 1 | 2) => void;
  quoteCoin: string;
  settlementCoin: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="pc-trade-form pc-trade-form-perp text-[12px]">
      <div className="pc-trade-form-tabs mb-2 grid grid-cols-2 gap-1 rounded bg-bgSection p-1">
        <button onClick={() => setMarginMode(2)} className={`h-7 rounded font-semibold ${marginMode === 2 ? 'bg-text text-white' : 'text-textSubPc'}`}>
          {t('perp.cross')}
        </button>
        <button onClick={() => setMarginMode(1)} className={`h-7 rounded font-semibold ${marginMode === 1 ? 'bg-text text-white' : 'text-textSubPc'}`}>
          {t('perp.isolated')}
        </button>
      </div>
      <div className="pc-trade-control-row mb-2 flex items-center gap-1">
        <button onClick={openLeverageSheet} className="flex h-8 flex-1 items-center justify-between rounded bg-bgSection px-2">
          <span>{leverage}x</span>
          <ChevronDown size={13} />
        </button>
        {QUICK_LEVERAGES.slice(0, 4).map((item) => (
          <button
            key={item}
            onClick={() => setLeverage(clampLeverage(item))}
            className={`h-8 w-9 rounded ${leverage === item ? 'bg-text text-white' : 'bg-bgSection text-textSubPc'}`}
          >
            {item}x
          </button>
        ))}
      </div>
      <button className="pc-trade-select mb-2 flex h-8 w-full items-center justify-between rounded bg-bgSection px-2" onClick={() => setOrderType((v) => (v === 1 ? 2 : 1))}>
        <span>{orderType === 1 ? t('trade.limitOrder') : t('trade.marketOrder')}</span>
        <ChevronDown size={13} />
      </button>
      {orderType === 1 ? (
        <PerpPcField label={t('trade.price')} unit={quoteCoin}>
          <input value={priceInput} onChange={(e) => setPriceInput(e.target.value)} inputMode="decimal" className="w-full bg-transparent text-[12px] outline-none num" />
        </PerpPcField>
      ) : null}
      <PerpPcField label={`${t('trade.amount')} (${amountUnit})`} unit={amountUnit}>
        <input value={amountInput} onChange={(e) => setAmountInput(e.target.value)} inputMode="decimal" className="w-full bg-transparent text-[12px] outline-none num" />
      </PerpPcField>
      <div className="pc-trade-percent mb-3 mt-3">
        <div className="relative mx-1 h-3">
          <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-line" />
          {[0, 25, 50, 75, 100].map((item) => (
            <button
              key={item}
              onClick={() => onPercent(item)}
              className={`absolute top-0 h-3 w-3 -translate-x-1/2 rounded-full border ${percent === item ? 'border-text bg-text' : 'border-line bg-bg'}`}
              style={{ left: `${item}%` }}
              aria-label={`${item}%`}
            />
          ))}
        </div>
        <div className="mt-1 grid grid-cols-5 text-[10px] text-textSubPc">
          {[0, 25, 50, 75, 100].map((item) => (
            <button key={item} onClick={() => onPercent(item)}>{item === 0 ? '0' : `${item}%`}</button>
          ))}
        </div>
      </div>
      <div className="mb-1 flex justify-between text-textSubPc">
        <span>{t('trade.available')}</span>
        <span className="pc-price text-text">{available} {settlementCoin}</span>
      </div>
      <div className="mb-3 flex justify-between text-textSubPc">
        <span>{t('perp.margin')}</span>
        <span className="pc-price text-text">{notionalPreview.marginSettlement.toFixed(2)} {settlementCoin}</span>
      </div>
      <div className="pc-trade-action-grid grid grid-cols-2 gap-2">
        <button disabled={placing || !token} onClick={() => onPlace(1)} className="h-9 rounded bg-up text-[13px] font-bold text-white disabled:opacity-50">
          {t('perp.long')}
        </button>
        <button disabled={placing || !token} onClick={() => onPlace(2)} className="h-9 rounded bg-down text-[13px] font-bold text-white disabled:opacity-50">
          {t('perp.short')}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-textSub">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <EmptyIcon />
      <div className="mt-4 text-base font-bold">{text}</div>
    </div>
  );
}

function BottomSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65">
      <button className="absolute inset-0" onClick={onClose} aria-label="close" />
      <div className="aster-bottom-sheet relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white pb-safe">
        <div className="mx-auto mt-2 h-1 w-8 rounded-full bg-slate-200" />
        <button className="absolute right-4 top-3.5 flex h-7 w-7 items-center justify-center rounded-[4px] bg-slate-100 text-slate-600 hover:bg-slate-200 transition" onClick={onClose}>
          <X size={16} />
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}

function NumberPad({ onPress }: { onPress: (key: string) => void }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];
  return (
    <div className="-mx-4 mt-6 grid grid-cols-3 border-t border-line bg-bgSoft text-2xl">
      {keys.map((key, index) => (
        <button
          key={`${key}-${index}`}
          disabled={!key}
          onClick={() => key && onPress(key)}
          className="flex h-[60px] items-center justify-center border-b border-r border-white bg-bgSoft disabled:bg-bg"
        >
          {key === 'back' ? <span className="text-base">⌫</span> : key}
        </button>
      ))}
    </div>
  );
}

function OrderList({ orders }: { orders: PerpOrder[] }) {
  const { t } = useTranslation();
  return (
    <ul className="mt-3 space-y-2">
      {orders.map((o) => {
        const isOpen = o.side === 1 || o.side === 2;
        const dir = o.side === 1 ? 'openLong' : o.side === 2 ? 'openShort' : 'closePosition';
        const long = o.side === 1 || o.side === 3;
        return (
          <li key={o.id} className="rounded-lg border border-line p-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`font-medium ${long ? 'text-up' : 'text-down'}`}>{t(`perp.${dir}`)}</span>
                <span className="text-textSub">
                  {o.symbol} · {o.leverage}x · {o.orderType === 1 ? t('trade.limit') : t('trade.market')}
                </span>
              </div>
              <span className="text-textSub">{isOpen ? t('perp.openSuccess') : t('perp.closed')}</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] num">
              <Stat label={t('perp.openPrice')} value={o.dealPrice ?? o.price} />
              <Stat label={t('perp.quantity')} value={o.amount} />
              <Stat label={t('perp.margin')} value={o.margin} />
            </div>
            <div className="mt-1 text-[11px] text-textSub">{o.createdAt}</div>
          </li>
        );
      })}
    </ul>
  );
}

function PositionList({
  positions,
  onClosePos,
  defaultQuoteCoin = 'USDT',
}: {
  positions: PositionVO[];
  onClosePos: (id: number) => void;
  defaultQuoteCoin?: string;
}) {
  const { t } = useTranslation();
  return (
    <ul className="mt-3 space-y-2">
      {positions.map((p) => {
        const long = p.side === 1;
        const pnlPositive = Number(p.unrealizedPnl) >= 0;
        const quoteCoin = p.settlementCoin || defaultQuoteCoin;
        return (
          <li key={p.id} className="rounded-lg border border-line p-3 text-xs">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${long ? 'text-up' : 'text-down'}`}>{long ? t('perp.long') : t('perp.short')}</span>
                <span className="text-textSub">
                  {p.symbol} · {p.leverage}x · {p.marginMode === 1 ? t('perp.isolated') : t('perp.cross')}
                </span>
              </div>
              <button className="h-7 rounded bg-bgSoft px-2 text-xs text-text" onClick={() => onClosePos(p.id)}>
                <X size={12} className="inline" /> {t('perp.closePosition')}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 text-[11px] num">
              <Stat label={t('perp.quantity')} value={p.amount} />
              <Stat label={t('perp.openPrice')} value={p.openPrice} />
              <Stat label={t('perp.markPrice')} value={p.markPrice} />
              <Stat label={t('perp.liqPrice')} value={p.liqPrice} />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] num">
              <Stat label={t('perp.margin')} value={`${p.margin} ${quoteCoin}`} />
              <div>
                <div className="text-textSub">{t('perp.pnl')}</div>
                <div className={pnlPositive ? 'font-medium text-up' : 'font-medium text-down'}>
                  {pnlPositive ? '+' : ''}
                  {p.unrealizedPnl}
                </div>
              </div>
              <div>
                <div className="text-textSub">{t('perp.pnlRate')}</div>
                <div className={pnlPositive ? 'font-medium text-up' : 'font-medium text-down'}>
                  {pnlPositive ? '+' : ''}
                  {p.pnlRate}%
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function HistoryOrdersView({
  active,
  setActive,
  onBack,
  positions,
  history,
  onClosePos,
  defaultQuoteCoin,
}: {
  active: (typeof HISTORY_TABS)[number];
  setActive: (v: (typeof HISTORY_TABS)[number]) => void;
  onBack: () => void;
  positions: PositionVO[];
  history: PerpHistoryPosition[];
  onClosePos: (id: number) => void;
  defaultQuoteCoin: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto min-h-screen max-w-md bg-bg pb-10">
      <div className="relative flex h-14 items-center justify-center border-b border-line">
        <button className="absolute left-4" onClick={onBack}>
          <ChevronDown size={22} className="rotate-90" />
        </button>
        <h1 className="text-lg font-bold">{t('perp.historyOrders')}</h1>
      </div>
      <div className="grid grid-cols-2 border-b border-line text-center">
        {HISTORY_TABS.map((k) => (
          <button key={k} onClick={() => setActive(k)} className={`h-12 text-base ${active === k ? 'border-b-2 border-text font-bold' : 'text-textSub'}`}>
            {k === 'positions' ? t('perp.currentPositions') : t('perp.historyPositions')}
          </button>
        ))}
      </div>
      <div className="px-4">
        {active === 'positions' ? (
          positions.length === 0 ? <Empty text={t('common.noData')} /> : <PositionList positions={positions} onClosePos={onClosePos} defaultQuoteCoin={defaultQuoteCoin} />
        ) : history.length === 0 ? (
          <Empty text={t('common.noData')} />
        ) : (
          <ul className="mt-3 space-y-2">
            {history.map((p) => {
              const long = p.side === 1;
              const pnlPositive = Number(p.realizedPnl) >= 0;
              return (
                <li key={p.id} className="rounded-lg border border-line p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${long ? 'text-up' : 'text-down'}`}>{long ? t('perp.long') : t('perp.short')}</span>
                      <span className="text-textSub">
                        {p.symbol} · {p.leverage}x
                      </span>
                    </div>
                    <span className="text-textSub">{p.status === 3 ? t('perp.liquidated') : t('perp.closed')}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] num">
                    <Stat label={t('perp.quantity')} value={p.amount} />
                    <Stat label={t('perp.openPrice')} value={p.openPrice} />
                    <div>
                      <div className="text-textSub">{t('perp.pnl')}</div>
                      <div className={pnlPositive ? 'font-medium text-up' : 'font-medium text-down'}>
                        {pnlPositive ? '+' : ''}
                        {p.realizedPnl}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-textSub">{p.closedAt}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ChartIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 23 23" fill="none" aria-hidden="true">
      <path d="M7 4v15M16 4v15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 8h6M13 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 8v6M16 9v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="23" height="23" viewBox="0 0 23 23" fill="none" aria-hidden="true">
      <path
        d="m11.5 3.2 2.45 4.96 5.48.8-3.97 3.86.94 5.45-4.9-2.58-4.9 2.58.94-5.45L3.57 8.96l5.48-.8L11.5 3.2Z"
        stroke="currentColor"
        fill={filled ? 'currentColor' : 'none'}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DepthIcon() {
  return (
    <div className="grid h-8 w-8 grid-cols-2 gap-[2px] rounded bg-bgSoft p-2">
      <span className="bg-up" />
      <span className="bg-down" />
      <span className="bg-down" />
      <span className="bg-up" />
    </div>
  );
}

function EmptyIcon() {
  return (
    <div className="relative h-16 w-16 text-text">
      <div className="absolute left-3 top-2 h-10 w-10 rounded border border-text" />
      <div className="absolute left-1 top-7 h-8 w-12 rounded border border-text bg-bg" />
      <div className="absolute right-1 top-0 h-8 w-8 rounded-full bg-text" />
      <SlidersHorizontal className="absolute right-0 top-1 text-bg" size={26} />
      <Plus className="absolute bottom-2 left-1" size={16} />
    </div>
  );
}

function PerpPcField({ label, unit, children }: { label: string; unit?: string; children: ReactNode }) {
  return (
    <div className="mb-2 flex h-10 items-center justify-between gap-2 rounded-md bg-bgSection px-3">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-textSubPc">{label}</div>
        {children}
      </div>
      {unit ? <span className="shrink-0 text-[12px] font-semibold">{unit}</span> : null}
    </div>
  );
}
