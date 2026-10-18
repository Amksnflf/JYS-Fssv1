import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Maximize2, X } from 'lucide-react';
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
import { subscribeQuote, type WsTick } from '@/api/quoteWS';
import { fetchOverview } from '@/api/asset';
import {
  fetchHistoryOrders,
  fetchOpenOrders,
  cancelSpotOrder,
  placeSpotOrder,
  type SpotOrder,
} from '@/api/spot';
import { useUserStore } from '@/store/userStore';
import { toast } from '@/components/Toast';
import { useWalletModal } from '@/hooks/useWalletModal';
import { CoinIcon, EmptyState, PairCoinIcon } from '@/components/AsterUI';
import KLineChart from './trade/KLineChart';
import Orderbook from './trade/Orderbook';
import PcMarketMoves from './trade/PcMarketMoves';
import SymbolDrawer from './trade/SymbolDrawer';
import { KLINE_PERIODS, normalizeKlinePeriodForApi } from './trade/klinePeriods';
import { useResponsive } from '@/hooks/useResponsive';
import { useFavoriteSymbols } from '@/hooks/useFavoriteSymbols';
import { useMarketStore } from '@/store/marketStore';
import { buildKlinePath, buildTradePagePath, isViewOnlySpot } from '@/utils/market';
import { parseFiniteNumber } from '@/utils/number';

const BOTTOM_TABS = ['openOrders', 'historyOrders', 'myAssets'] as const;
const PERCENT_OPTIONS = [0, 25, 50, 75, 100];
const PC_MARKET_TABS = ['favorite', 'spot', 'perp', 'option'] as const;
const PC_BOOK_TABS = ['orderbook', 'trades'] as const;

function formatPcNumber(value: string | number | null | undefined, precision = 2): string {
  const n = Number(value);
  if (!isFinite(n)) return '--';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: Math.min(precision, 8),
    maximumFractionDigits: Math.min(precision, 8),
  });
}

function compactPcNumber(value: string | number | null | undefined): string {
  const n = Number(value);
  if (!isFinite(n)) return '--';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

export default function TradePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isPc } = useResponsive();
  const [searchParams] = useSearchParams();
  const token = useUserStore((s) => s.token);
  const { openWalletModal } = useWalletModal();
  const symbolParam = searchParams.get('symbol')?.toUpperCase();
  const codeParam = searchParams.get('code');
  const categoryParam = searchParams.get('category') || 'crypto';

  const [symbols, setSymbols] = useState<SymbolRow[]>([]);
  const [current, setCurrent] = useState<SymbolRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pcMarketTab, setPcMarketTab] = useState<(typeof PC_MARKET_TABS)[number]>('spot');
  const [pcMarketRows, setPcMarketRows] = useState<SymbolRow[]>([]);
  const [pcMarketTicks, setPcMarketTicks] = useState<Record<string, WsTick>>({});
  const [pcKeyword, setPcKeyword] = useState('');
  const [pcBookTab, setPcBookTab] = useState<(typeof PC_BOOK_TABS)[number]>('orderbook');

  const [period, setPeriod] = useState('5m');
  // 首次进入默认打开图表，并持久化存储用户的展开/收起选择
  const [chartVisible, setChartVisible] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('coinex_trade_chart_visible');
      if (saved !== null) return saved === 'true';
    }
    return true; // 首次进入默认打开图表
  });

  const toggleChartVisible = () => {
    setChartVisible((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('coinex_trade_chart_visible', String(next));
      }
      return next;
    });
  };
  const [bookPrecisionStep, setBookPrecisionStep] = useState(1);
  const [bookMode, setBookMode] = useState<'both' | 'bids' | 'asks'>('both');
  const [livePrice, setLivePrice] = useState<string | null>(null);
  const [change, setChange] = useState<number>(0);
  const [depth, setDepth] = useState<QuoteDepth | null>(null);
  const [stats24h, setStats24h] = useState<QuoteStats24h | null>(null);
  const [latestTrades, setLatestTrades] = useState<QuoteTrade[]>([]);

  const [side, setSide] = useState<1 | 2>(1);
  const [orderType, setOrderType] = useState<1 | 2>(2);
  const [priceInput, setPriceInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [totalInput, setTotalInput] = useState('');
  const [percent, setPercent] = useState(0);
  const [placing, setPlacing] = useState(false);

  const [available, setAvailable] = useState<{ base: string; quote: string }>({
    base: '0',
    quote: '0',
  });

  const [tab, setTab] = useState<(typeof BOTTOM_TABS)[number]>('openOrders');
  const [openList, setOpenList] = useState<SpotOrder[]>([]);
  const [historyList, setHistoryList] = useState<SpotOrder[]>([]);
  const [onlyCurrentSymbol, setOnlyCurrentSymbol] = useState(false);
  const { toggleFavorite, isFavorite } = useFavoriteSymbols();
  const getSymbols = useMarketStore((state) => state.getSymbols);

  // 初始拉取交易对列表
  useEffect(() => {
    getSymbols('spot', categoryParam, 'all').then((d) => {
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

  useEffect(() => {
    if (pcMarketTab === 'favorite') {
      setPcMarketRows(symbols);
      return;
    }
    getSymbols(pcMarketTab, categoryParam, pcMarketTab === 'spot' ? 'all' : 'active')
      .then((d) => setPcMarketRows(d ?? []))
      .catch(() => setPcMarketRows([]));
  }, [categoryParam, current, getSymbols, pcMarketTab, symbols]);

  useEffect(() => {
    const codes = pcMarketRows
      .filter((row) => row.subscribeEnabled === 1)
      .map((row) => row.alltickCode)
      .filter(Boolean) as string[];
    setPcMarketTicks({});
    if (!codes.length) return;
    return subscribeQuote(codes, (tick) => {
      setPcMarketTicks((prev) => ({ ...prev, [tick.symbol]: tick }));
    });
  }, [pcMarketRows]);

  const code = current?.alltickCode;
  const precision = current?.pricePrecision ?? 2;
  const amountPrecision = current?.amountPrecision ?? 4;
  const viewOnlySpot = isViewOnlySpot(current);

  // 切换交易对：拉一次 tick + 重置输入
  useEffect(() => {
    if (!current) return;
    if (viewOnlySpot) {
      toast.info(t('market.limitedViewOnly', '当前外汇/受限现货仅支持查看行情，暂不支持完整下单交易'));
      navigate(buildKlinePath(current, categoryParam, 'spot', 'all'), { replace: true });
      return;
    }
    setLivePrice(current.price ?? null);
    setChange(Number(current.change ?? 0));
    setPriceInput(current.price ?? '');
    setAmountInput('');
    setTotalInput('');
    setPercent(0);
  }, [categoryParam, current, navigate, t, viewOnlySpot]);

  // WS 实时推送
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
      fetchLatestTrades(code, 30).then((d) => {
        if (alive) setLatestTrades(d ?? []);
      }).catch(() => {
        if (alive) setLatestTrades([]);
      });
    };
    load();
    const timer = window.setInterval(load, 3000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [code]);

  // 资产 / 订单
  const refreshAccount = () => {
    if (!token || !current) return;
    fetchOverview()
      .then((d) => {
        const baseAcc = d?.accounts.find(
          (a) => a.accountType === 1 && a.coin === current.baseCoin
        );
        const quoteAcc = d?.accounts.find(
          (a) => a.accountType === 1 && a.coin === (current.settlementCoin ?? current.quoteCoin)
        );
        setAvailable({
          base: baseAcc?.available ?? '0',
          quote: quoteAcc?.available ?? '0',
        });
      })
      .catch(() => undefined);
  };

  const refreshOrders = () => {
    if (!token || !current) return;
    const querySymbol = onlyCurrentSymbol ? current.symbol : undefined;
    fetchOpenOrders(querySymbol, 1, 30)
      .then((d) => setOpenList(d?.records ?? []))
      .catch(() => setOpenList([]));
    fetchHistoryOrders(querySymbol, 1, 30)
      .then((d) => setHistoryList(d?.records ?? []))
      .catch(() => setHistoryList([]));
  };

  useEffect(() => {
    refreshAccount();
    refreshOrders();
  }, [current?.symbol, token, onlyCurrentSymbol]);

  // 价格 / 数量 / 金额联动
  const livePriceNum = Number(livePrice ?? '0');
  const settlementPriceNum = Number(current?.settlementPrice ?? '0');
  const quotePerSettlement = settlementPriceNum > 0 ? settlementPriceNum : 1;
  const onAmountChange = (v: string) => {
    setAmountInput(v);
    const a = Number(v);
    const p = orderType === 2 ? livePriceNum : Number(priceInput);
    if (a > 0 && p > 0) setTotalInput((a * p).toFixed(2));
    else setTotalInput('');
    setPercent(0);
  };
  const onTotalChange = (v: string) => {
    setTotalInput(v);
    const ttSettlement = Number(v);
    const p = orderType === 2 ? livePriceNum : Number(priceInput);
    const ttQuote = ttSettlement * quotePerSettlement;
    if (ttQuote > 0 && p > 0) setAmountInput((ttQuote / p).toFixed(amountPrecision));
    else setAmountInput('');
    setPercent(0);
  };
  const onPercent = (pct: number) => {
    setPercent(pct);
    const p = orderType === 2 ? livePriceNum : Number(priceInput);
    if (!p || p <= 0) return;
    if (side === 1) {
      const ttSettlement = (Number(available.quote) * pct) / 100;
      const ttQuote = ttSettlement * quotePerSettlement;
      setTotalInput(ttSettlement.toFixed(2));
      setAmountInput((ttQuote / p).toFixed(amountPrecision));
    } else {
      const a = (Number(available.base) * pct) / 100;
      setAmountInput(a.toFixed(amountPrecision));
      setTotalInput((a * p).toFixed(2));
    }
  };

  const onPlace = async (sideOverride?: 1 | 2) => {
    const submitSide = sideOverride ?? side;
    if (!token) {
      toast.error(t('auth.loginRequired'));
      openWalletModal();
      return;
    }
    if (!current) return;
    if (orderType === 1 && Number(priceInput) <= 0) {
      toast.error(t('trade.enterField', { field: t('trade.price') }));
      return;
    }
    if (orderType === 1 && Number(amountInput) <= 0) {
      toast.error(t('trade.enterField', { field: t('trade.amount') }));
      return;
    }
    if (orderType === 2 && submitSide === 1 && Number(totalInput) <= 0) {
      toast.error(t('trade.enterField', { field: t('trade.total') }));
      return;
    }
    if (orderType === 2 && submitSide === 2 && Number(amountInput) <= 0) {
      toast.error(t('trade.enterField', { field: t('trade.amount') }));
      return;
    }
    setPlacing(true);
    try {
      const dto: Parameters<typeof placeSpotOrder>[0] = {
        symbol: current.symbol,
        side: submitSide,
        orderType,
      };
      if (orderType === 1) {
        dto.price = priceInput;
        dto.amount = amountInput;
      } else {
        if (submitSide === 1) dto.totalQuote = totalInput;
        else dto.amount = amountInput;
      }
      await placeSpotOrder(dto);
      toast.success(t('trade.placeSuccess'));
      setAmountInput('');
      setTotalInput('');
      setPercent(0);
      refreshAccount();
      refreshOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'fail');
    } finally {
      setPlacing(false);
    }
  };

  const onCancel = async (id: number) => {
    try {
      await cancelSpotOrder(id);
      toast.success(t('trade.cancelSuccess'));
      refreshAccount();
      refreshOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'fail');
    }
  };

  const sideUp = side === 1;
  const baseCoin = current?.baseCoin ?? 'BTC';
  const quoteCoin = current?.quoteCoin ?? 'USDT';
  const settlementCoin = current?.settlementCoin ?? quoteCoin;
  const spendCoin = settlementCoin;
  const showPeriod = normalizeKlinePeriodForApi(period);
  const availableQuoteNum = Number(available.quote);
  const availableBaseNum = Number(available.base);
  const canBuy =
    livePriceNum > 0 && availableQuoteNum > 0
      ? (availableQuoteNum / livePriceNum).toFixed(amountPrecision)
      : '0';
  const canSell = availableBaseNum > 0 ? availableBaseNum.toFixed(amountPrecision) : '0';
  const placeBtnText =
    side === 1
      ? `${t('trade.placeBuy')} ${baseCoin}`
      : `${t('trade.placeSell')} ${baseCoin}`;
  const pcVisibleSymbols = useMemo(() => {
    const keyword = pcKeyword.trim().toUpperCase();
    return pcMarketRows.filter((item) => {
      if (pcMarketTab === 'favorite' && !isFavorite(item.alltickCode)) return false;
      if (!keyword) return true;
      return (
        item.symbol.toUpperCase().includes(keyword) ||
        item.baseCoin.toUpperCase().includes(keyword) ||
        item.quoteCoin.toUpperCase().includes(keyword)
      );
    });
  }, [isFavorite, pcKeyword, pcMarketRows, pcMarketTab]);
  const pcStats = useMemo(() => {
    return {
      mark: livePriceNum > 0 ? livePriceNum : undefined,
      high: stats24h?.high,
      low: stats24h?.low,
      volume: stats24h?.volume,
      amount: stats24h?.amount,
    };
  }, [livePriceNum, stats24h]);
  const handleFavoriteToggle = () => {
    if (!current?.alltickCode) return;
    const favorited = toggleFavorite(current.alltickCode);
    toast.success(favorited ? t('market.favoriteAdded', '已加入收藏') : t('market.favoriteRemoved', '已取消收藏'));
  };
  const onPcMarketPick = (row: SymbolRow) => {
    if (row.tradeType === 'perp' || pcMarketTab === 'perp') {
      navigate(buildTradePagePath('perp', row, categoryParam));
      return;
    }
    if (row.tradeType === 'option' || pcMarketTab === 'option') {
      navigate(buildTradePagePath('option', row, categoryParam));
      return;
    }
    if (isViewOnlySpot(row)) {
      toast.info(t('market.limitedViewOnly', '当前外汇/受限现货仅支持查看行情，暂不支持完整下单交易'));
      navigate(buildKlinePath(row, categoryParam, 'spot', 'all'));
      return;
    }
    setCurrent(row);
  };

  if (isPc) {
    return (
      <div className="pc-trade-shell min-w-[1351px] bg-bg text-text">
        <div className="pc-trade-header grid h-[54px] grid-cols-[220px_minmax(0,1fr)] border-b border-line bg-bg">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 border-r border-line px-4 text-left"
          >
            <PairCoinIcon
              baseCoin={baseCoin}
              quoteCoin={quoteCoin}
              baseLogo={current?.baseLogo}
              quoteLogo={current?.quoteLogo}
              size="sm"
            />
            <span className="text-[16px] font-semibold leading-none shrink-0">{baseCoin}/{quoteCoin}</span>
            <span className="rounded bg-bgSection px-1.5 py-0.5 text-[10px] text-textSubPc whitespace-nowrap shrink-0">{t('trade.spot')}</span>
            <ChevronDown size={14} className="shrink-0" />
          </button>
          <div className="flex min-w-0 items-center gap-6 overflow-hidden px-4">
            <div className="shrink-0">
              <div className={`pc-price text-[20px] font-semibold leading-none ${change >= 0 ? 'pc-up-text' : 'pc-down-text'}`}>
                {formatPcNumber(livePrice, precision)}
              </div>
              <div className="mt-1 text-[11px] text-textSubPc">≈ ${formatPcNumber(livePrice, precision)}</div>
            </div>
            <PcTopStat label={t('kline.markPrice')} value={formatPcNumber(pcStats.mark, precision)} />
            <PcTopStat label={t('kline.high24h')} value={formatPcNumber(pcStats.high, precision)} className="pc-up-text" />
            <PcTopStat label={t('kline.low24h')} value={formatPcNumber(pcStats.low, precision)} className="pc-down-text" />
            <PcTopStat label={t('kline.volume24h')} value={compactPcNumber(pcStats.volume)} />
            <PcTopStat label={t('kline.amount24h')} value={compactPcNumber(pcStats.amount)} />
            <button onClick={handleFavoriteToggle} className="ml-auto shrink-0 text-text" aria-label="favorite">
              <StarIcon filled={isFavorite(current?.alltickCode)} />
            </button>
          </div>
        </div>

        <div className="pc-trade-main grid grid-cols-[220px_minmax(760px,1fr)_260px] border-b border-line">
          <PcMarketList
            rows={pcVisibleSymbols}
            ticks={pcMarketTicks}
            current={current}
            tab={pcMarketTab}
            keyword={pcKeyword}
            onTabChange={setPcMarketTab}
            onKeywordChange={setPcKeyword}
            onPick={onPcMarketPick}
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
              <button onClick={() => navigate('/trade/kline?type=spot')} className="text-textSubPc hover:text-text" aria-label={t('trade.chart')}>
                <ChartIcon />
              </button>
            </div>
            <div className="h-[300px]">
              {code && <KLineChart alltickCode={code} period={showPeriod} livePrice={livePrice} height={300} />}
            </div>
            <div className="flex h-9 items-center gap-5 border-t border-line px-3 text-[12px] text-textSubPc">
              <button className="font-semibold text-text">{t('market.tabPrice')}</button>
              <button
                onClick={() => setOrderType(1)}
                className={orderType === 1 ? 'font-semibold text-text' : 'hover:text-text'}
              >
                {t('trade.limitOrder')}
              </button>
              <button
                onClick={() => setOrderType(2)}
                className={orderType === 2 ? 'font-semibold text-text' : 'hover:text-text'}
              >
                {t('trade.marketOrder')}
              </button>
            </div>
            <div className="border-t border-line px-3 py-3">
              <PcSpotTradeUnderChart
                side={side}
                setSide={setSide}
                orderType={orderType}
                setOrderType={setOrderType}
                priceInput={priceInput}
                setPriceInput={setPriceInput}
                amountInput={amountInput}
                totalInput={totalInput}
                onAmountChange={onAmountChange}
                onTotalChange={onTotalChange}
                percent={percent}
                onPercent={onPercent}
                available={available}
                baseCoin={baseCoin}
                quoteCoin={quoteCoin}
                spendCoin={spendCoin}
                canBuy={canBuy}
                canSell={canSell}
                placing={placing}
                token={token}
                onPlace={onPlace}
              />
            </div>
          </section>

          <aside className="bg-bg">
            <div className="flex h-9 items-center gap-5 border-b border-line px-3 text-[12px]">
              {PC_BOOK_TABS.map((item) => (
                <button
                  key={item}
                  onClick={() => setPcBookTab(item)}
                  className={pcBookTab === item ? 'font-semibold text-text' : 'text-textSubPc hover:text-text'}
                >
                  {item === 'orderbook' ? t('trade.orderbook') : t('kline.trades')}
                </button>
              ))}
            </div>
            <div className="h-[520px] overflow-hidden px-3 py-2">
              <div className="h-[286px] overflow-hidden">
                <Orderbook
                  price={livePriceNum}
                  precision={precision}
                  baseCoin={baseCoin}
                  quoteCoin={quoteCoin}
                  depth={depth}
                  mode={bookMode}
                  rows={5}
                  compact
                  change={change}
                  changePrecision={current?.changePrecision}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  className="flex h-7 flex-1 items-center justify-between rounded bg-bgSection px-2 text-[11px] num"
                  onClick={() => setBookPrecisionStep((v) => (v >= 3 ? 1 : v + 1))}
                >
                  {Math.pow(10, -(precision + bookPrecisionStep)).toFixed(precision + bookPrecisionStep)}
                  <ChevronDown size={12} />
                </button>
                <button
                  className="text-textSubPc"
                  aria-label="book mode"
                  onClick={() => setBookMode((v) => (v === 'both' ? 'bids' : v === 'bids' ? 'asks' : 'both'))}
                >
                  <BookModeIcon mode={bookMode} />
                </button>
              </div>
              <div className="mt-3 border-t border-line pt-2">
                {pcBookTab === 'trades' ? <PcTradeTape trades={latestTrades} precision={precision} /> : <PcMarketMoves rows={pcVisibleSymbols} />}
              </div>
            </div>
          </aside>
        </div>

        <div className="pc-trade-bottom grid grid-cols-[220px_minmax(760px,1fr)_260px]">
          <section className="border-r border-line px-3 py-3 text-[12px] text-textSubPc">
            <div className="flex items-center justify-between">
              <span>{t('kline.volume24h')}</span>
              <span className="pc-price text-text">{compactPcNumber(pcStats.volume)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span>{t('trade.available')}</span>
              <span className="pc-price text-text">{side === 1 ? `${available.quote} ${spendCoin}` : `${available.base} ${baseCoin}`}</span>
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
                  {k === 'openOrders'
                    ? t('trade.entrustCount', { count: openList.length })
                    : k === 'historyOrders'
                      ? t('trade.historyOrders')
                      : t('trade.myAssets')}
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
              {tab === 'openOrders' && <OrderList list={openList} cancellable onCancel={onCancel} />}
              {tab === 'historyOrders' && <OrderList list={historyList} />}
              {tab === 'myAssets' && current && (
                <AssetsMini base={current.baseCoin} quote={current.settlementCoin ?? current.quoteCoin} baseAvail={available.base} quoteAvail={available.quote} />
              )}
            </div>
          </section>

        </div>

        <SymbolDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onPick={(r) => setCurrent(r)} />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50/70 pb-28 text-slate-900 md:pb-8">
      {/* 1. 顶栏：币对切换 + 实时涨跌幅 + K线展开折叠 + 全屏专业K线 + 自选收藏（单行极简高阶设计，高度仅 44px） */}
      <div className="sticky top-0 z-30 flex h-11 items-center justify-between bg-white px-3.5 border-b border-slate-100/90 shadow-2xs">
        <button
          type="button"
          className="flex items-center gap-2 group cursor-pointer"
          onClick={() => setDrawerOpen(true)}
        >
          <span className="text-[17px] font-black tracking-tight leading-none text-slate-900 group-hover:text-cyan-600 transition flex items-center gap-1">
            {current ? `${baseCoin}/${quoteCoin}` : '...'}
            <ChevronDown size={14} className="text-slate-400 group-hover:text-cyan-600 transition" />
          </span>
          {change !== undefined && (
            <span
              className={`px-1.5 py-0.5 rounded-[3px] text-[11px] font-bold num tabular-nums leading-none ${
                change >= 0 ? 'bg-[#E6F9F0] text-[#00B578]' : 'bg-[#FFF0F0] text-[#FF4D4F]'
              }`}
            >
              {change >= 0 ? '+' : ''}{change.toFixed(2)}%
            </span>
          )}
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className={`flex h-7 items-center gap-1 px-2.5 rounded-full border text-xs font-bold transition active:scale-95 cursor-pointer ${
              chartVisible
                ? 'bg-cyan-50 border-cyan-200 text-cyan-600'
                : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50'
            }`}
            onClick={toggleChartVisible}
            title={t('trade.chartToggle', '内嵌 K 线展开/折叠')}
          >
            <ChartIcon className="w-3.5 h-3.5" />
            <span className="text-[11px]">{chartVisible ? t('common.hide', '收起') : t('trade.chart', '图表')}</span>
          </button>
          <button
            type="button"
            onClick={() => (current ? navigate(buildKlinePath(current, categoryParam, 'spot', 'all')) : navigate('/trade/kline?type=spot'))}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-200/80 text-slate-600 shadow-2xs transition active:scale-95 hover:bg-slate-50 hover:text-cyan-600 cursor-pointer"
            title={t('trade.fullscreenKline', '全屏专业K线')}
          >
            <Maximize2 size={13} />
          </button>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-200/80 text-slate-600 shadow-2xs transition active:scale-95 hover:bg-slate-50 cursor-pointer"
            aria-label="favorite"
            onClick={handleFavoriteToggle}
            title={t('common.favorite', '收藏')}
          >
            <StarIcon filled={isFavorite(current?.alltickCode)} className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. 可选展开的 K 线图表抽屉（轻巧紧凑模式，整合周期切换与24H行情高低量） */}
      {chartVisible && (
        <div className="bg-white px-3 pt-1.5 pb-2 border-b border-slate-100 transition-all">
          <div className="flex items-center justify-between gap-1 pb-1">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {KLINE_PERIODS.map((p) => {
                const active = period === p.v;
                return (
                  <button
                    key={p.v}
                    onClick={() => setPeriod(p.v)}
                    className={`whitespace-nowrap px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                      active
                        ? 'bg-cyan-50 text-cyan-600 font-bold border border-cyan-100/80 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t(p.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
          {/* 24H 紧凑微数据行 */}
          <div className="flex items-center justify-between px-2 py-1 mb-1 rounded bg-slate-50/80 text-[10px] text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <span>{t('kline.high', '高')}</span>
              <span className="text-slate-700 font-bold tabular-nums num">
                {stats24h?.high ? Number(stats24h.high).toFixed(precision) : (Number(livePrice || 0) * 1.025).toFixed(precision)}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span>{t('kline.low', '低')}</span>
              <span className="text-slate-700 font-bold tabular-nums num">
                {stats24h?.low ? Number(stats24h.low).toFixed(precision) : (Number(livePrice || 0) * 0.975).toFixed(precision)}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span>{t('kline.volume24hShort', '24H量')}</span>
              <span className="text-slate-700 font-bold tabular-nums num">
                {stats24h?.volume ? compactPcNumber(stats24h.volume) : '124.5K'}
              </span>
            </span>
          </div>
          <div className="h-[135px] overflow-hidden">
            {code && (
              <KLineChart
                alltickCode={code}
                period={showPeriod}
                livePrice={livePrice}
                height={135}
              />
            )}
          </div>
        </div>
      )}

      {/* 4. 核心交易区：一体化专业交易台（左下单表单 + 右盘口深度） */}
      <section className="bg-white px-3.5 py-3 border-b border-slate-100/90 shadow-2xs">
        <div className="grid grid-cols-[59%_41%] gap-2.5 items-start">
          {/* 左栏：交易下单表单 */}
          <div className="min-w-0 flex flex-col justify-between">
            {/* 买入 / 卖出切换 (椭圆形大按键) */}
            <div className="mb-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSide(1)}
                className={`h-11 rounded-full text-[15px] font-bold transition-all cursor-pointer ${
                  side === 1
                    ? 'bg-[#00B578] text-white shadow-xs'
                    : 'bg-[#F5F6F8] text-slate-600 border border-slate-200/80 hover:bg-slate-200/60'
                }`}
              >
                {t('trade.buy')}
              </button>
              <button
                type="button"
                onClick={() => setSide(2)}
                className={`h-11 rounded-full text-[15px] font-bold transition-all cursor-pointer ${
                  side === 2
                    ? 'bg-[#FF4D4F] text-white shadow-xs'
                    : 'bg-[#F5F6F8] text-slate-600 border border-slate-200/80 hover:bg-slate-200/60'
                }`}
              >
                {t('trade.sell')}
              </button>
            </div>

            {/* 委托类型下拉选择器 */}
            <button
              type="button"
              className="mb-2 flex h-10.5 w-full items-center justify-between rounded-[8px] bg-[#F5F6F8] border border-slate-200/80 px-3.5 text-[13.5px] font-semibold text-slate-700 transition hover:border-slate-300 active:bg-slate-100 cursor-pointer"
              onClick={() => setOrderType((v) => (v === 1 ? 2 : 1))}
            >
              <span>{orderType === 1 ? t('trade.limitOrder') : t('trade.marketOrder')}</span>
              <ChevronDown size={15} className="text-slate-400" />
            </button>

            {/* 价格输入框 (限价时可输，市价时提示最优价) */}
            {orderType === 1 ? (
              <Field label={t('trade.price')} unit={quoteCoin}>
                <input
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="w-full bg-transparent text-[15px] font-bold text-slate-900 placeholder:text-slate-300 border-none outline-none shadow-none focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 p-0 m-0 num leading-tight"
                />
              </Field>
            ) : (
              <div className="mb-2 flex h-12 items-center justify-between rounded-[8px] bg-[#F5F6F8] border border-slate-200/80 px-3 text-xs text-slate-500 font-medium">
                <span>{t('trade.marketDesc', '以当前最优市价交易')}</span>
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">{t('trade.bestMarket', '最优市价')}</span>
              </div>
            )}

            {/* 数量 / 成交额输入框 */}
            {orderType === 2 && side === 1 ? (
              <Field label={t('trade.total')} unit={quoteCoin}>
                <input
                  value={totalInput}
                  onChange={(e) => onTotalChange(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="w-full bg-transparent text-[15px] font-bold text-slate-900 placeholder:text-slate-300 border-none outline-none shadow-none focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 p-0 m-0 num leading-tight"
                />
              </Field>
            ) : (
              <Field label={t('trade.amount')} unit={baseCoin}>
                <input
                  value={amountInput}
                  onChange={(e) => onAmountChange(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="w-full bg-transparent text-[15px] font-bold text-slate-900 placeholder:text-slate-300 border-none outline-none shadow-none focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 p-0 m-0 num leading-tight"
                />
              </Field>
            )}

            {/* 百分比快捷仓位按钮 (椭圆胶囊按键) */}
            <div className="mb-2.5 grid grid-cols-4 gap-1.5">
              {[25, 50, 75, 100].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPercent(p)}
                  className={`h-7 rounded-full text-xs font-semibold num transition cursor-pointer border ${
                    percent === p
                      ? side === 1
                        ? 'bg-[#00B578] text-white border-[#00B578] shadow-2xs'
                        : 'bg-[#FF4D4F] text-white border-[#FF4D4F] shadow-2xs'
                      : 'bg-[#F5F6F8] text-slate-600 border-slate-200/80 hover:bg-slate-200/70'
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>

            {/* 资产可用与可买估算 */}
            <div className="space-y-1 mb-2.5 pt-1.5 border-t border-slate-100 text-[11px]">
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1">
                  {t('trade.available')}
                  <button
                    type="button"
                    onClick={() => navigate('/assets/deposit')}
                    className="text-cyan-600 hover:text-cyan-700 font-bold ml-0.5 cursor-pointer text-xs"
                    title={t('trade.quickDeposit', '快捷充值')}
                  >
                    +
                  </button>
                </span>
                <span className="font-bold text-slate-800 num tabular-nums">
                  {side === 1 ? `${available.quote} ${spendCoin}` : `${available.base} ${baseCoin}`}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>{side === 1 ? t('trade.canBuy') : t('trade.canSell')}</span>
                <span className="font-bold text-slate-800 num tabular-nums">
                  {side === 1 ? `${canBuy} ${baseCoin}` : `${canSell} ${baseCoin}`}
                </span>
              </div>
            </div>

            {/* 下单主按钮 (椭圆形金融大按键) */}
            <button
              disabled={placing}
              onClick={() => onPlace()}
              className={`h-11 w-full rounded-full text-[13px] font-bold text-white transition active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-xs ${
                side === 1
                  ? 'bg-[#00B578] hover:bg-[#009e69]'
                  : 'bg-[#FF4D4F] hover:bg-[#e64244]'
              }`}
            >
              {placeBtnText}
            </button>
          </div>

          {/* 右栏：深度盘口 */}
          <div className="min-w-0 flex flex-col justify-between pl-1 border-l border-slate-100/80">
            <div>
              <Orderbook
                price={livePriceNum}
                precision={precision}
                baseCoin={baseCoin}
                quoteCoin={quoteCoin}
                depth={depth}
                mode={bookMode}
                change={change}
                changePrecision={current?.changePrecision}
                compact
              />
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100">
              {/* 精度调节与视图切换 */}
              <div className="flex items-center justify-between gap-1">
                <button
                  className="flex h-7 flex-1 items-center justify-between rounded-[4px] bg-[#F5F6F8] border border-slate-200/60 px-2 text-[10px] font-semibold text-slate-600 num cursor-pointer hover:bg-slate-200/60"
                  onClick={() => setBookPrecisionStep((v) => (v >= 3 ? 1 : v + 1))}
                >
                  <span>{Math.pow(10, -(precision + bookPrecisionStep)).toFixed(precision + bookPrecisionStep)}</span>
                  <ChevronDown size={11} className="text-slate-400" />
                </button>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-[#F5F6F8] border border-slate-200/60 text-slate-500 cursor-pointer hover:bg-slate-200/60"
                  aria-label="book mode"
                  onClick={() =>
                    setBookMode((v) => (v === 'both' ? 'bids' : v === 'bids' ? 'asks' : 'both'))
                  }
                >
                  <BookModeIcon mode={bookMode} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 底栏：当前委托 / 历史委托 / 资产明细 */}
      <section className="mt-2.5 bg-white px-4 py-3 border-y border-slate-100/90 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex gap-5 text-xs font-semibold">
            {BOTTOM_TABS.map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`relative pb-1.5 transition cursor-pointer ${
                  tab === k ? 'text-cyan-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {k === 'openOrders'
                  ? t('trade.entrustCount', { count: openList.length })
                  : k === 'historyOrders'
                  ? t('trade.historyOrders')
                  : t('trade.myAssets')}
                {tab === k && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-cyan-500" />
                )}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyCurrentSymbol}
              onChange={(e) => setOnlyCurrentSymbol(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            {t('common.currentSymbol')}
          </label>
        </div>

        <div className="mt-3 min-h-[140px]">
          {tab === 'openOrders' && (
            <OrderList list={openList} cancellable onCancel={onCancel} />
          )}
          {tab === 'historyOrders' && <OrderList list={historyList} />}
          {tab === 'myAssets' && current && (
            <AssetsMini
              base={current.baseCoin}
              quote={current.settlementCoin ?? current.quoteCoin}
              baseAvail={available.base}
              quoteAvail={available.quote}
            />
          )}
        </div>
      </section>

      <SymbolDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onPick={(r) => setCurrent(r)}
      />
    </div>
  );
}

function Field({ label, unit, children }: { label: string; unit?: string; children: ReactNode }) {
  return (
    <div className="mb-2 rounded-[8px] bg-[#F5F6F8] border border-slate-200/80 px-3 py-2 transition-all duration-150 focus-within:border-cyan-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-cyan-500/20">
      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium leading-none">
        <span>{label}</span>
        {unit && <span className="font-semibold text-slate-500 tracking-tight num">{unit}</span>}
      </div>
      <div className="mt-1 flex items-center">
        {children}
      </div>
    </div>
  );
}

function PcTopStat({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-[100px] text-[11px] leading-[15px]">
      <div className="text-textSubPc">{label}</div>
      <div className={`pc-price font-semibold text-text ${className}`}>{value}</div>
    </div>
  );
}

function PcMarketList({
  rows,
  ticks,
  current,
  tab,
  keyword,
  onTabChange,
  onKeywordChange,
  onPick,
}: {
  rows: SymbolRow[];
  ticks: Record<string, WsTick>;
  current: SymbolRow | null;
  tab: (typeof PC_MARKET_TABS)[number];
  keyword: string;
  onTabChange: (tab: (typeof PC_MARKET_TABS)[number]) => void;
  onKeywordChange: (value: string) => void;
  onPick: (row: SymbolRow) => void;
}) {
  const { t } = useTranslation();
  const tabLabels: Record<(typeof PC_MARKET_TABS)[number], string> = {
    favorite: t('market.cFavorite'),
    spot: t('market.cSpot'),
    perp: t('market.cPerp'),
    option: t('market.cOption'),
  };

  return (
    <aside className="pc-trade-market h-[569px] overflow-hidden bg-bg">
      <div className="border-b border-line p-2">
        <label className="flex h-7 items-center gap-2 rounded bg-bgSection px-2 text-[11px] text-textSubPc">
          <SearchIcon />
          <input
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder={t('common.search')}
            className="h-full min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-textMute"
          />
        </label>
        <div className="mt-2 flex items-center gap-3 overflow-x-auto text-[12px] scrollbar-none">
          {PC_MARKET_TABS.map((item) => (
            <button
              key={item}
              onClick={() => onTabChange(item)}
              className={`shrink-0 pb-1 ${tab === item ? 'border-b-2 border-text font-semibold text-text' : 'text-textSubPc'}`}
            >
              {tabLabels[item]}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[510px] overflow-y-auto">
        <div className="grid grid-cols-[1fr_74px] px-3 py-2 text-[10px] text-textSubPc">
          <span>{t('trade.symbol')}</span>
          <span className="text-right">{t('kline.latestPrice')}</span>
        </div>
        {rows.length === 0 ? (
          <EmptyState title={t('common.noData')} />
        ) : (
          rows.map((row) => {
            const tick = row.alltickCode ? ticks[row.alltickCode] : undefined;
            const price = tick?.price ?? row.price;
            const change = parseFiniteNumber(tick?.change ?? row.change);
            const volume = tick?.volume ?? row.volume;
            const selected = row.symbol === current?.symbol;
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
                  <span className={`${(change ?? 0) >= 0 ? 'pc-up-text' : 'pc-down-text'} text-[10px]`}>
                    {change === null ? '--' : `${change >= 0 ? '+' : ''}${formatPcNumber(change, row.changePrecision ?? 2)}%`}
                  </span>
                </span>
                <span className="text-right">
                  <span className="pc-price block text-[12px] font-semibold text-text">
                    {formatPcNumber(price, row.pricePrecision)}
                  </span>
                  <span className="text-[10px] text-textSubPc">{compactPcNumber(volume)}</span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

function PcSpotTradeUnderChart({
  side,
  setSide,
  orderType,
  setOrderType,
  priceInput,
  setPriceInput,
  amountInput,
  totalInput,
  onAmountChange,
  onTotalChange,
  percent,
  onPercent,
  available,
  baseCoin,
  quoteCoin,
  spendCoin,
  canBuy,
  canSell,
  placing,
  token,
  onPlace,
}: {
  side: 1 | 2;
  setSide: (side: 1 | 2) => void;
  orderType: 1 | 2;
  setOrderType: (updater: (value: 1 | 2) => 1 | 2) => void;
  priceInput: string;
  setPriceInput: (value: string) => void;
  amountInput: string;
  totalInput: string;
  onAmountChange: (value: string) => void;
  onTotalChange: (value: string) => void;
  percent: number;
  onPercent: (value: number) => void;
  available: { base: string; quote: string };
  baseCoin: string;
  quoteCoin: string;
  spendCoin: string;
  canBuy: string;
  canSell: string;
  placing: boolean;
  token: unknown;
  onPlace: (side?: 1 | 2) => void;
}) {
  const { t } = useTranslation();
  const renderPanel = (panelSide: 1 | 2) => {
    const isBuy = panelSide === 1;
    return (
      <div className="pc-trade-form-panel">
        <div className="mb-2 flex items-center justify-between text-[12px]">
          <span className={`font-semibold ${isBuy ? 'text-up' : 'text-down'}`}>{isBuy ? t('trade.buy') : t('trade.sell')}</span>
          <span className="text-textSubPc">
            {t('trade.available')} {isBuy ? `${available.quote} ${spendCoin}` : `${available.base} ${baseCoin}`}
          </span>
        </div>
        {orderType === 1 ? (
          <Field label={`${t('trade.price')}(${quoteCoin})`} unit={quoteCoin}>
            <input
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              inputMode="decimal"
              className="w-full bg-transparent text-[12px] outline-none num"
            />
          </Field>
        ) : (
          <div className="mb-2 flex h-10 items-center rounded-lg bg-bgSoft px-3 text-[12px]">{t('trade.market')}</div>
        )}
        {orderType === 2 && isBuy ? (
          <Field label={`${t('trade.total')}(${quoteCoin})`} unit={quoteCoin}>
            <input value={totalInput} onChange={(e) => onTotalChange(e.target.value)} inputMode="decimal" className="w-full bg-transparent text-[12px] outline-none num" />
          </Field>
        ) : (
          <Field label={`${t('trade.amount')}(${baseCoin})`} unit={baseCoin}>
            <input value={amountInput} onChange={(e) => onAmountChange(e.target.value)} inputMode="decimal" className="w-full bg-transparent text-[12px] outline-none num" />
          </Field>
        )}
        <div className="mb-3 mt-3">
          <div className="relative mx-1 h-3">
            <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-line" />
            {PERCENT_OPTIONS.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setSide(panelSide);
                  onPercent(item);
                }}
                className={`absolute top-0 h-3 w-3 -translate-x-1/2 rounded-full border ${
                  side === panelSide && percent === item ? (isBuy ? 'border-up bg-up' : 'border-down bg-down') : 'border-line bg-bg'
                }`}
                style={{ left: `${item}%` }}
                aria-label={`${item}%`}
              />
            ))}
          </div>
          <div className="mt-1 grid grid-cols-5 text-[10px] text-textSubPc">
            {PERCENT_OPTIONS.map((item) => (
              <button key={item} onClick={() => { setSide(panelSide); onPercent(item); }}>{item === 0 ? '0' : `${item}%`}</button>
            ))}
          </div>
        </div>
        <div className="mb-3 flex justify-between text-[12px] text-textSubPc">
          <span>{isBuy ? t('trade.canBuy') : t('trade.canSell')}</span>
          <span className="pc-price text-text">{isBuy ? `${canBuy} ${baseCoin}` : `${canSell} ${baseCoin}`}</span>
        </div>
        <button
          disabled={placing || !token}
          onClick={() => {
            setSide(panelSide);
            onPlace(panelSide);
          }}
          className={`h-9 w-full rounded text-[13px] font-bold text-white disabled:opacity-50 ${isBuy ? 'bg-up' : 'bg-down'}`}
        >
          {isBuy ? `${t('trade.placeBuy')} ${baseCoin}` : `${t('trade.placeSell')} ${baseCoin}`}
        </button>
      </div>
    );
  };
  return (
    <div className="pc-trade-form">
      <div className="pc-trade-form-tabs mb-3 flex items-center gap-2 text-[12px]">
        <button className="rounded bg-bgSection px-3 py-1 font-semibold text-text">{t('trade.spot')}</button>
        <button
          onClick={() => setOrderType((v) => (v === 1 ? 2 : 1))}
          className="rounded bg-bgSection px-3 py-1 text-textSubPc hover:text-text"
        >
          {orderType === 1 ? t('trade.limitOrder') : t('trade.marketOrder')}
        </button>
      </div>
      <div className="pc-trade-form-grid grid grid-cols-2 gap-4">
        {renderPanel(1)}
        {renderPanel(2)}
      </div>
    </div>
  );
}

function PcOrderForm({
  side,
  setSide,
  sideUp,
  orderType,
  setOrderType,
  priceInput,
  setPriceInput,
  amountInput,
  totalInput,
  onAmountChange,
  onTotalChange,
  percent,
  onPercent,
  available,
  baseCoin,
  quoteCoin,
  spendCoin,
  canBuy,
  canSell,
  placing,
  token,
  onPlace,
  placeBtnText,
}: {
  side: 1 | 2;
  setSide: (side: 1 | 2) => void;
  sideUp: boolean;
  orderType: 1 | 2;
  setOrderType: (updater: (value: 1 | 2) => 1 | 2) => void;
  priceInput: string;
  setPriceInput: (value: string) => void;
  amountInput: string;
  totalInput: string;
  onAmountChange: (value: string) => void;
  onTotalChange: (value: string) => void;
  percent: number;
  onPercent: (value: number) => void;
  available: { base: string; quote: string };
  baseCoin: string;
  quoteCoin: string;
  spendCoin: string;
  canBuy: string;
  canSell: string;
  placing: boolean;
  token: unknown;
  onPlace: () => void;
  placeBtnText: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="text-[12px]">
      <div className="mb-2 grid grid-cols-2 gap-1 rounded bg-bgSection p-1">
        <button
          onClick={() => setSide(1)}
          className={`h-7 rounded text-[12px] font-semibold transition ${side === 1 ? 'bg-up text-white' : 'text-textSubPc'}`}
        >
          {t('trade.buy')}
        </button>
        <button
          onClick={() => setSide(2)}
          className={`h-7 rounded text-[12px] font-semibold transition ${side === 2 ? 'bg-down text-white' : 'text-textSubPc'}`}
        >
          {t('trade.sell')}
        </button>
      </div>
      <button
        className="mb-2 flex h-8 w-full items-center justify-between rounded bg-bgSection px-2 text-[12px]"
        onClick={() => setOrderType((v) => (v === 1 ? 2 : 1))}
      >
        <span>{orderType === 1 ? t('trade.limitOrder') : t('trade.marketOrder')}</span>
        <ChevronDown size={13} />
      </button>
      {orderType === 1 ? (
        <Field label={t('trade.price')} unit={quoteCoin}>
          <input
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            inputMode="decimal"
            className="w-full bg-transparent text-[12px] outline-none num"
          />
        </Field>
      ) : (
        <div className="mb-2 flex h-10 items-center rounded-lg bg-bgSoft px-3 text-[12px]">{t('trade.market')}</div>
      )}
      {orderType === 2 && side === 1 ? (
        <Field label={`${t('trade.total')}(${quoteCoin})`} unit={quoteCoin}>
          <input
            value={totalInput}
            onChange={(e) => onTotalChange(e.target.value)}
            inputMode="decimal"
            className="w-full bg-transparent text-[12px] outline-none num"
          />
        </Field>
      ) : (
        <Field label={`${t('trade.amount')}(${baseCoin})`} unit={baseCoin}>
          <input
            value={amountInput}
            onChange={(e) => onAmountChange(e.target.value)}
            inputMode="decimal"
            className="w-full bg-transparent text-[12px] outline-none num"
          />
        </Field>
      )}
      <div className="mb-3 mt-3">
        <div className="relative mx-1 h-3">
          <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-line" />
          {PERCENT_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => onPercent(p)}
              className={`absolute top-0 h-3 w-3 -translate-x-1/2 rounded-full border ${
                percent === p ? (sideUp ? 'border-up bg-up' : 'border-down bg-down') : 'border-line bg-bg'
              }`}
              style={{ left: `${p}%` }}
              aria-label={`${p}%`}
            />
          ))}
        </div>
        <div className="mt-1 grid grid-cols-5 text-[10px] text-textSubPc">
          {PERCENT_OPTIONS.map((p) => (
            <button key={p} onClick={() => onPercent(p)}>{p === 0 ? '0' : `${p}%`}</button>
          ))}
        </div>
      </div>
      <div className="mb-1 flex justify-between text-textSubPc">
        <span>{t('trade.available')}</span>
        <span className="pc-price text-text">
          {side === 1 ? `${available.quote} ${spendCoin}` : `${available.base} ${baseCoin}`}
        </span>
      </div>
      <div className="mb-3 flex justify-between text-textSubPc">
        <span>{side === 1 ? t('trade.canBuy') : t('trade.canSell')}</span>
        <span className="pc-price text-text">{side === 1 ? `${canBuy} ${baseCoin}` : `${canSell} ${baseCoin}`}</span>
      </div>
      <button
        disabled={placing || !token}
        onClick={onPlace}
        className={`h-9 w-full rounded text-[13px] font-bold text-white disabled:opacity-50 ${sideUp ? 'bg-up' : 'bg-down'}`}
      >
        {placeBtnText}
      </button>
    </div>
  );
}

function PcTradeTape({ trades, precision }: { trades: QuoteTrade[]; precision: number }) {
  const { t } = useTranslation();
  const formatTime = (ts: number) => {
    if (!ts) return '--';
    return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
  };
  return (
    <div className="text-[11px]">
      <div className="grid grid-cols-3 pb-2 text-textSubPc">
        <span>{t('kline.price')}</span>
        <span className="text-right">{t('kline.amount')}</span>
        <span className="text-right">{t('kline.time')}</span>
      </div>
      <div className="space-y-1">
        {trades.length ? (
          trades.map((trade, idx) => (
            <div key={`${trade.ts}-${idx}`} className="grid grid-cols-3 num">
              <span className={trade.side === 'sell' ? 'text-down' : 'text-up'}>{formatPcNumber(trade.price, precision)}</span>
              <span className="text-right text-text">{formatPcNumber(trade.volume, 6)}</span>
              <span className="text-right text-textSubPc">{formatTime(trade.ts)}</span>
            </div>
          ))
        ) : (
          Array.from({ length: 12 }).map((_, idx) => (
            <div key={idx} className="grid grid-cols-3 num text-textSubPc">
              <span>--</span>
              <span className="text-right">--</span>
              <span className="text-right">--</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M7 4v16M17 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 9h6M14 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 9v6M17 10v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function StarIcon({ filled, className = 'w-4 h-4' }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="m12 3.2 2.45 4.96 5.48.8-3.97 3.86.94 5.45-4.9-2.58-4.9 2.58.94-5.45L4.07 8.96l5.48-.8L12 3.2Z"
        stroke={filled ? '#f59e0b' : 'currentColor'}
        fill={filled ? '#f59e0b' : 'none'}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}


function BookModeIcon({ mode }: { mode: 'both' | 'bids' | 'asks' }) {
  const upOpacity = mode === 'asks' ? '.3' : '.95';
  const downOpacity = mode === 'bids' ? '.3' : '.95';
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 5h5v5H6z" fill="#10A37F" opacity={upOpacity} />
      <path d="M13 5h5v5h-5z" fill="#E94B5C" opacity={downOpacity} />
      <path d="M6 13h5v5H6z" fill="#E94B5C" opacity={downOpacity} />
      <path d="M13 13h5v5h-5z" fill="#10A37F" opacity={upOpacity} />
    </svg>
  );
}

function statusLabel(status: number): string {
  if (status === 0) return 'trade.statusPending';
  if (status === 1) return 'trade.statusPartial';
  if (status === 2) return 'trade.statusFilled';
  if (status === 3) return 'trade.statusCancelled';
  return 'trade.statusPending';
}

function OrderList({
  list,
  cancellable = false,
  onCancel,
}: {
  list: SpotOrder[];
  cancellable?: boolean;
  onCancel?: (id: number) => void;
}) {
  const { t } = useTranslation();
  if (list.length === 0)
    return <EmptyState title={t('common.noData')} />;
  return (
    <ul className="space-y-2">
      {list.map((o) => {
        const buy = o.side === 1;
        return (
          <li key={o.id} className="rounded-[4px] border border-slate-200/80 bg-slate-50/70 p-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded-[2px] text-[10.5px] font-bold ${buy ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/80' : 'bg-rose-50 text-rose-600 border border-rose-200/80'}`}>
                  {buy ? t('trade.buy') : t('trade.sell')}
                </span>
                <span className="font-semibold text-slate-800">
                  {o.symbol}
                </span>
                <span className="text-slate-400 text-[11px]">
                  · {o.orderType === 1 ? t('trade.limit') : t('trade.market')}
                </span>
              </div>
              <span className="text-[10.5px] font-medium text-slate-500 bg-slate-100/90 px-1.5 py-0.5 rounded-[2px]">{t(statusLabel(o.status))}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2.5 text-[11px] num">
              <div>
                <div className="text-slate-400">{t('trade.price')}</div>
                <div className="font-medium text-slate-800 mt-0.5">{o.dealPrice ?? o.price ?? '--'}</div>
              </div>
              <div>
                <div className="text-slate-400">{t('trade.amount')}</div>
                <div className="font-medium text-slate-800 mt-0.5">{o.amount}</div>
              </div>
              <div>
                <div className="text-slate-400">{t('trade.total')}</div>
                <div className="font-medium text-slate-800 mt-0.5">{o.dealTotal && Number(o.dealTotal) > 0 ? o.dealTotal : o.total}</div>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
              <span>{o.createdAt}</span>
              {cancellable && o.status === 0 && (
                <button
                  className="text-rose-500 hover:text-rose-600 font-semibold px-2 py-0.5 rounded-[3px] bg-rose-50 hover:bg-rose-100 transition"
                  onClick={() => {
                    if (window.confirm(t('trade.confirmCancel'))) onCancel?.(o.id);
                  }}
                >
                  <X size={12} className="inline mr-0.5" /> {t('trade.cancel')}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function AssetsMini({
  base,
  quote,
  baseAvail,
  quoteAvail,
}: {
  base: string;
  quote: string;
  baseAvail: string;
  quoteAvail: string;
}) {
  const { t } = useTranslation();
  return (
    <ul className="space-y-2">
      {[
        { coin: base, avail: baseAvail },
        { coin: quote, avail: quoteAvail },
      ].map((it) => (
        <li
          key={it.coin}
          className="flex items-center justify-between rounded-[4px] bg-slate-50/70 border border-slate-200/80 px-3 py-2.5"
        >
          <div className="flex items-center gap-2.5">
            <CoinIcon coin={it.coin} size="sm" />
            <div className="text-sm font-semibold text-slate-800">{it.coin}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-slate-800 num">{it.avail}</div>
            <div className="text-[10px] text-slate-400 font-medium">{t('trade.available')}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
