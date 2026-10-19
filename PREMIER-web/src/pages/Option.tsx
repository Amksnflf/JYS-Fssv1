import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, MoreHorizontal, TrendingUp, TrendingDown, Clock, Sparkles, Maximize2 } from 'lucide-react';
import Picker from 'react-mobile-picker';
import { fetchDepth, fetchSymbols, fetchTick, type QuoteDepth, type SymbolRow } from '@/api/quote';
import { subscribeQuote } from '@/api/quoteWS';
import { fetchOverview } from '@/api/asset';
import { buildKlinePath } from '@/utils/market';
import {
  fetchOptionHistory,
  fetchOptionPeriods,
  fetchRunningOptions,
  placeOption,
  type OptionOrder,
  type OptionPeriod,
} from '@/api/option';
import { useUserStore } from '@/store/userStore';
import { toast } from '@/components/Toast';
import { useWalletModal } from '@/hooks/useWalletModal';
import { EmptyState, PairCoinIcon } from '@/components/AsterUI';
import KLineChart from './trade/KLineChart';
import Orderbook from './trade/Orderbook';
import PcMarketMoves from './trade/PcMarketMoves';
import SymbolDrawer from './trade/SymbolDrawer';
import { KLINE_PERIODS, normalizeKlinePeriodForApi } from './trade/klinePeriods';
import { useResponsive } from '@/hooks/useResponsive';
import { useFavoriteSymbols } from '@/hooks/useFavoriteSymbols';
import { useMarketStore } from '@/store/marketStore';

const PERCENTS = [0, 25, 50, 75, 100];
type PcMarketTab = 'favorite' | 'spot' | 'perp' | 'option';
const FALLBACK_PERIODS: OptionPeriod[] = [
  { seconds: 30, payoutRate: '0.20' },
  { seconds: 60, payoutRate: '0.30' },
  { seconds: 120, payoutRate: '0.40' },
  { seconds: 300, payoutRate: '0.50' },
  { seconds: 600, payoutRate: '0.55' },
  { seconds: 1800, payoutRate: '0.60' },
  { seconds: 3600, payoutRate: '0.65' },
];

function fmtPayout(rate: string): string {
  const n = Number(rate) * 100;
  return `${n.toFixed(0)}%`;
}

function fmtSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${seconds / 60}m`;
  return `${seconds / 3600}h`;
}

function defaultScheduleTime() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 1);
  d.setSeconds(0, 0);
  return d;
}

function formatDateTime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

export default function OptionPage() {
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
  const [pcMarketTab, setPcMarketTab] = useState<PcMarketTab>('option');
  const [pcKeyword, setPcKeyword] = useState('');

  const [klPeriod, setKlPeriod] = useState('1m');
  const [chartVisible, setChartVisible] = useState(true);
  const [livePrice, setLivePrice] = useState<string | null>(null);
  const [change, setChange] = useState(0);
  const [depth, setDepth] = useState<QuoteDepth | null>(null);
  const [bookMode, setBookMode] = useState<'both' | 'bids' | 'asks'>('both');
  const [bookPrecisionStep, setBookPrecisionStep] = useState(0);

  const [periods, setPeriods] = useState<OptionPeriod[]>([]);
  const [pickedPeriod, setPickedPeriod] = useState<number>(60);
  const [tradeMode, setTradeMode] = useState<'instant' | 'timed'>('instant');
  const [direction, setDirection] = useState<1 | 2>(() =>
    sideParam === 'sell' || sideParam === 'down' || sideParam === 'put' || sideParam === '2' ? 2 : 1
  );
  useEffect(() => {
    if (sideParam === 'sell' || sideParam === 'down' || sideParam === 'put' || sideParam === '2') {
      setDirection(2);
    } else if (sideParam === 'buy' || sideParam === 'up' || sideParam === 'call' || sideParam === '1') {
      setDirection(1);
    }
  }, [sideParam]);
  const [amountInput, setAmountInput] = useState('');
  const [percent, setPercent] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<Date>(() => defaultScheduleTime());

  const [available, setAvailable] = useState('0');
  const [tab, setTab] = useState<'running' | 'history'>('running');
  const [running, setRunning] = useState<OptionOrder[]>([]);
  const [history, setHistory] = useState<OptionOrder[]>([]);
  const [onlyCurrentSymbol, setOnlyCurrentSymbol] = useState(false);
  const { toggleFavorite, isFavorite } = useFavoriteSymbols();
  const getSymbols = useMarketStore((state) => state.getSymbols);

  const [tick, setTick] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    getSymbols('option', categoryParam, 'active').then((d) => {
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
    fetchOptionPeriods()
      .then((rows) => {
        const nextRows = rows?.length ? rows : FALLBACK_PERIODS;
        setPeriods(nextRows);
        if (nextRows.length) setPickedPeriod(nextRows[0].seconds);
      })
      .catch(() => {
        setPeriods(FALLBACK_PERIODS);
        setPickedPeriod(FALLBACK_PERIODS[0].seconds);
      });
  }, []);

  const code = current?.alltickCode;
  const precision = current?.pricePrecision ?? 2;
  const baseCoin = current?.baseCoin ?? 'BTC';
  const quoteCoin = current?.quoteCoin ?? 'USDT';
  const settlementCoin = current?.settlementCoin ?? quoteCoin;

  useEffect(() => {
    if (!code) return;
    setLivePrice(null);
    const unsub = subscribeQuote([code], (tk) => {
      if (tk.symbol !== code) return;
      setLivePrice(tk.price);
      setChange(Number(tk.change ?? 0));
    });
    fetchTick(code).then((tk) => {
      if (tk?.price) setLivePrice(tk.price);
      if (tk?.change !== undefined) setChange(Number(tk.change));
    }).catch(() => undefined);
    return () => unsub();
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
    };
    load();
    const timer = window.setInterval(load, 3000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [code]);

  const refreshBalance = () => {
    if (!token || !current) return;
    fetchOverview()
      .then((o) => {
        const account = o.accounts?.find((a) => a.accountType === 2 && a.coin === (current.settlementCoin ?? current.quoteCoin));
        setAvailable(account?.available ?? '0');
      })
      .catch(() => {});
  };
  useEffect(() => {
    refreshBalance();
  }, [token, current?.quoteCoin, current?.settlementCoin]);

  useEffect(() => {
    if (!token) return;
    const reload = () =>
      fetchRunningOptions().then((rs) => setRunning(rs ?? [])).catch(() => {});
    reload();
    timerRef.current = window.setInterval(() => {
      setTick((x) => x + 1);
      reload();
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [token]);

  useEffect(() => {
    if (!token || tab !== 'history') return;
    fetchOptionHistory(1, 30)
      .then((p) => setHistory(p?.records ?? []))
      .catch(() => setHistory([]));
  }, [tab, token]);

  useEffect(() => {
    if (!percent) return;
    const n = (Number(available) * percent) / 100;
    setAmountInput(n.toFixed(2));
  }, [percent, available]);

  const handlePlace = async (dir: 1 | 2) => {
    if (!token) {
      toast.error(t('auth.loginRequired'));
      openWalletModal();
      return;
    }
    if (!current) return;
    const amt = Number(amountInput);
    if (!amt || amt <= 0) {
      toast.error(t('option.amount'));
      return;
    }
    setDirection(dir);
    setPlacing(true);
    try {
      await placeOption({
        symbol: current.symbol,
        direction: dir,
        periodSeconds: pickedPeriod,
        amount: amt,
        scheduledAt: tradeMode === 'timed' ? formatDateTime(scheduledAt) : undefined,
      });
      toast.success(t('option.placeSuccess'));
      setAmountInput('');
      setPercent(0);
      refreshBalance();
      fetchRunningOptions().then((rs) => setRunning(rs ?? []));
    } catch (e: any) {
      toast.error(e?.message ?? 'fail');
    } finally {
      setPlacing(false);
    }
  };

  const livePriceNum = useMemo(() => (livePrice ? Number(livePrice) : Number(current?.price ?? 0)), [current?.price, livePrice]);

  const currentPayout = useMemo(() => {
    return periods.find((p) => p.seconds === pickedPeriod)?.payoutRate ?? '0';
  }, [periods, pickedPeriod]);
  const minAmount = periods.find((p) => p.seconds === pickedPeriod)?.seconds ? 100 : 100;
  const showKlPeriod = normalizeKlinePeriodForApi(klPeriod);
  const pickedPeriodLabel = `${fmtSeconds(pickedPeriod)}-${fmtPayout(currentPayout)}`;
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
  const visibleRunning = useMemo(() => {
    if (!onlyCurrentSymbol || !current) return running;
    return running.filter((item) => item.symbol === current.symbol);
  }, [current, onlyCurrentSymbol, running]);
  const visibleHistory = useMemo(() => {
    if (!onlyCurrentSymbol || !current) return history;
    return history.filter((item) => item.symbol === current.symbol);
  }, [current, history, onlyCurrentSymbol]);
  const onPcMarketTabChange = (next: PcMarketTab) => {
    if (next === 'spot' || next === 'perp') {
      const params = current
        ? new URLSearchParams({
            symbol: current.symbol,
            code: current.alltickCode,
            category: current.category || categoryParam,
          })
        : null;
      navigate(`${next === 'spot' ? '/trade' : '/perp'}${params ? `?${params.toString()}` : ''}`);
      return;
    }
    setPcMarketTab(next);
  };

  if (isPc) {
    return (
      <div className="pc-trade-shell min-w-[1351px] bg-bg text-text">
        <div className="pc-trade-header grid h-[54px] grid-cols-[220px_minmax(0,1fr)] border-b border-line bg-bg">
          <button className="flex items-center gap-2 border-r border-line px-4 text-left" onClick={() => setDrawerOpen(true)}>
            <PairCoinIcon
              baseCoin={baseCoin}
              quoteCoin={quoteCoin}
              baseLogo={current?.baseLogo}
              quoteLogo={current?.quoteLogo}
              size="sm"
            />
            <span className="text-[16px] font-semibold leading-none">{baseCoin}/{quoteCoin}</span>
            <span className="rounded bg-bgSection px-1.5 py-0.5 text-[10px] text-textSubPc">{t('nav.option')}</span>
            <ChevronDown size={14} className="text-text" />
          </button>
          <div className="flex items-center justify-between gap-5 overflow-hidden px-4">
            <div>
              <div className={`num pc-price text-[20px] font-semibold leading-none ${change >= 0 ? 'pc-up-text' : 'pc-down-text'}`}>
                {livePriceNum.toLocaleString('en-US', { maximumFractionDigits: precision })}
              </div>
              <div className={`mt-1 text-[11px] ${change >= 0 ? 'pc-up-text' : 'pc-down-text'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(current?.changePrecision ?? 2)}%
              </div>
            </div>
            <OptionPcTopStat label={t('option.payout')} value={fmtPayout(currentPayout)} className="pc-up-text" />
            <OptionPcTopStat label={t('option.tradeInterval', { value: '' })} value={pickedPeriodLabel} />
            <OptionPcTopStat label={t('option.currentBalance')} value={`${Number(available).toLocaleString('en-US')} ${settlementCoin}`} />
            <OptionPcTopStat label={t('option.minBuy')} value={`${minAmount.toLocaleString('en-US')} ${settlementCoin}`} />
            <button className="shrink-0 text-text" aria-label="favorite" onClick={handleFavoriteToggle}>
              <StarIcon filled={isFavorite(current?.alltickCode)} />
            </button>
          </div>
        </div>

        <div className="pc-trade-main grid grid-cols-[220px_minmax(760px,1fr)_260px] border-b border-line">
          <OptionPcMarketList
            rows={pcSymbols}
            current={current}
            activeTab={pcMarketTab}
            keyword={pcKeyword}
            onTabChange={onPcMarketTabChange}
            onKeywordChange={setPcKeyword}
            onPick={setCurrent}
          />

          <section className="min-w-0 border-x border-line bg-bg">
            <div className="flex h-9 items-center gap-4 overflow-x-auto border-b border-line px-3 text-[12px] scrollbar-none">
              {KLINE_PERIODS.map((p) => (
                <button
                  key={`${p.v}-${p.labelKey}`}
                  onClick={() => setKlPeriod(p.v)}
                  className={`whitespace-nowrap transition ${klPeriod === p.v ? 'font-semibold text-text' : 'text-textSubPc hover:text-text'}`}
                >
                  {t(p.labelKey)}
                </button>
              ))}
              <span className="h-3 w-px shrink-0 bg-line" />
              <button className="font-semibold text-text">MA</button>
              <button className="text-textSubPc">EMA</button>
              <button className="text-textSubPc">BOLL</button>
            </div>
            <div className="h-[300px]">
              {code && <KLineChart alltickCode={code} period={showKlPeriod} livePrice={livePrice} height={300} />}
            </div>
            <div className="flex h-9 items-center gap-5 border-t border-line px-3 text-[12px] text-textSubPc">
              <button
                onClick={() => setTradeMode('instant')}
                className={tradeMode === 'instant' ? 'font-semibold text-text' : 'hover:text-text'}
              >
                {t('option.instantTrade')}
              </button>
              <button
                onClick={() => setTradeMode('timed')}
                className={tradeMode === 'timed' ? 'font-semibold text-text' : 'hover:text-text'}
              >
                {t('option.timedTrade')}
              </button>
              <button>{t('option.optionOrders')}</button>
            </div>
            <div className="border-t border-line px-3 py-3">
              <OptionPcOrderPanel
                tradeMode={tradeMode}
                setTradeMode={setTradeMode}
                direction={direction}
                setDirection={setDirection}
                periods={periods}
                pickedPeriod={pickedPeriod}
                setPickedPeriod={setPickedPeriod}
                pickedPeriodLabel={pickedPeriodLabel}
                timePickerOpen={timePickerOpen}
                setTimePickerOpen={setTimePickerOpen}
                scheduledAt={scheduledAt}
                amountInput={amountInput}
                setAmountInput={setAmountInput}
                percent={percent}
                setPercent={setPercent}
                available={available}
                currentPayout={currentPayout}
                placing={placing}
                handlePlace={handlePlace}
                minAmount={minAmount}
                quoteCoin={quoteCoin}
                settlementCoin={settlementCoin}
              />
            </div>
          </section>

          <aside className="bg-bg">
            <div className="flex h-9 items-center justify-between border-b border-line px-3 text-[12px]">
              <span className="font-semibold text-text">{t('trade.orderbook')}</span>
              <span className="text-up">{t('option.buyBook')}</span>
            </div>
            <div className="h-[520px] overflow-hidden px-3 py-2">
              <div className="h-[286px] overflow-hidden">
                <Orderbook
                  price={livePriceNum ?? 0}
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
              <span>{t('option.payout')}</span>
              <span className="pc-price text-up">{fmtPayout(currentPayout)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span>{t('option.currentBalance')}</span>
              <span className="pc-price text-text">{available} {settlementCoin}</span>
            </div>
          </section>

          <section className="col-span-2 min-w-0 px-4 py-3">
            <div className="flex gap-8 border-b border-line text-[13px]">
              {(['running', 'history'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`pb-3 ${tab === k ? 'border-b-2 border-text font-semibold text-text' : 'text-textSubPc'}`}
                >
                  {k === 'running' ? t('option.optionOrders') : t('finance.historyOrders')}
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
            {tab === 'running' ? <RunningListClean key={tick} rows={visibleRunning} /> : <HistoryListClean rows={visibleHistory} />}
          </section>

        </div>

        <SymbolDrawer
          open={drawerOpen}
          tradeType="option"
          onClose={() => setDrawerOpen(false)}
          onPick={(row) => {
            setCurrent(row);
            setDrawerOpen(false);
          }}
        />
        {timePickerOpen && (
          <TimePickerSheet
            value={scheduledAt}
            onCancel={() => setTimePickerOpen(false)}
            onConfirm={(value) => {
              setScheduledAt(value);
              setTimePickerOpen(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50/70 pb-28 text-slate-900 md:pb-8">
      {/* 1. 顶栏：币对切换 + 极速标签 + 实时涨跌幅 + K线展开折叠 + 全屏专业K线 + 自选收藏 */}
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
          <span className="text-[11px] font-medium text-slate-400">{t('nav.option', '极速')}</span>
          {change !== undefined && (
            <span
              className={`px-1.5 py-0.5 rounded-[3px] text-[11px] font-bold num tabular-nums leading-none ${
                change >= 0 ? 'bg-[#E6F9F0] text-[#00B578]' : 'bg-[#FFF0F0] text-[#FF4D4F]'
              }`}
            >
              {change >= 0 ? '+' : ''}{change.toFixed(current?.changePrecision ?? 2)}%
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
            onClick={() => setChartVisible((v) => !v)}
            title={t('trade.chartToggle', '内嵌 K 线展开/折叠')}
          >
            <ChartIcon className="w-3.5 h-3.5" />
            <span className="text-[11px]">{chartVisible ? t('common.hide', '收起') : t('trade.chart', '图表')}</span>
          </button>
          <button
            type="button"
            onClick={() => (current ? navigate(buildKlinePath(current, categoryParam, 'option', 'all')) : navigate('/trade/kline?type=option'))}
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

      {/* 2. 可选展开的 K 线图表抽屉 */}
      {chartVisible && (
        <div className="bg-white px-3 pt-1.5 pb-2 border-b border-slate-100 transition-all">
          <div className="flex items-center justify-between gap-1 pb-1">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {KLINE_PERIODS.map((p) => {
                const active = klPeriod === p.v;
                return (
                  <button
                    key={`${p.v}-${p.labelKey}`}
                    onClick={() => setKlPeriod(p.v)}
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
          <div className="h-[145px] overflow-hidden">
            {code && (
              <KLineChart
                alltickCode={code}
                period={showKlPeriod}
                livePrice={livePrice}
                height={145}
              />
            )}
          </div>
        </div>
      )}

      {/* 3. 核心交易区：一体化专业交易台（左下单表单 + 右盘口深度） */}
      <section className="bg-white px-3.5 py-3 border-b border-slate-100/90 shadow-2xs">
        <div className="grid grid-cols-[59%_41%] gap-2.5 items-start">
          {/* 左栏：期权下单表单 */}
          <div className="min-w-0 flex flex-col justify-between">
            {/* 看涨 / 看跌切换 (椭圆形大按键 - 加大尺寸更清晰易触) */}
            <div className="mb-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection(1)}
                className={`h-11 rounded-full text-[15px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  direction === 1
                    ? 'bg-[#00B578] text-white shadow-xs'
                    : 'bg-[#F5F6F8] text-slate-600 border border-slate-200/80 hover:bg-slate-200/60'
                }`}
              >
                <TrendingUp size={16} strokeWidth={2.5} />
                <span>{t('option.up', '看涨 CALL')}</span>
              </button>
              <button
                type="button"
                onClick={() => setDirection(2)}
                className={`h-11 rounded-full text-[15px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  direction === 2
                    ? 'bg-[#FF4D4F] text-white shadow-xs'
                    : 'bg-[#F5F6F8] text-slate-600 border border-slate-200/80 hover:bg-slate-200/60'
                }`}
              >
                <TrendingDown size={16} strokeWidth={2.5} />
                <span>{t('option.down', '看跌 PUT')}</span>
              </button>
            </div>

            {/* 交易模式切换与起投 (适度加大高度与字号) */}
            <div className="mb-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTradeMode((m) => (m === 'instant' ? 'timed' : 'instant'))}
                className="flex h-10.5 flex-1 items-center justify-between rounded-[8px] bg-[#F5F6F8] border border-slate-200/80 px-3.5 text-[13.5px] font-semibold text-slate-700 transition hover:border-slate-300 active:bg-slate-100 cursor-pointer"
              >
                <span>{tradeMode === 'instant' ? t('option.instantTrade', '闪电交易') : t('option.timedTrade', '定时交割')}</span>
                <ChevronDown size={15} className="text-slate-400" />
              </button>
              <div className="flex h-10.5 items-center shrink-0 rounded-[8px] bg-[#F5F6F8] border border-slate-200/80 px-3 text-xs text-slate-500 font-medium">
                <span>{t('option.minAmount', '起投')}</span>
                <span className="ml-1 text-[13.5px] font-bold text-slate-800 num">{minAmount}</span>
              </div>
            </div>

            {/* 定时交割时间选择器 (加大尺寸与字号) */}
            {tradeMode === 'timed' && (
              <button
                type="button"
                className="mb-2 flex h-10.5 w-full items-center justify-between rounded-[8px] bg-[#F5F6F8] border border-slate-200/80 px-3.5 text-xs text-slate-700 hover:border-cyan-500 transition cursor-pointer"
                onClick={() => setTimePickerOpen(true)}
              >
                <span className="text-xs text-slate-500 font-medium">{t('option.selectTime', '交割时间')}</span>
                <span className="num font-bold text-cyan-600 text-[14.5px]">
                  {scheduledAt.getHours().toString().padStart(2, '0')}:
                  {scheduledAt.getMinutes().toString().padStart(2, '0')}
                </span>
                <ChevronDown size={15} className="text-slate-400" />
              </button>
            )}

            {/* 交割周期选择 (精简卡片矩阵) */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-1">
                <span>{t('option.interval', '交割周期')}</span>
                <span className="text-[#00B578] font-bold num">{fmtPayout(currentPayout)} {t('option.payoutRate', '收益率')}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {periods.slice(0, 4).map((p) => {
                  const isActive = pickedPeriod === p.seconds;
                  return (
                    <button
                      key={p.seconds}
                      type="button"
                      onClick={() => setPickedPeriod(p.seconds)}
                      className={`flex items-center justify-between px-2.5 h-8 rounded-[6px] border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'border-cyan-500 bg-cyan-50/80 text-cyan-700 font-bold shadow-2xs'
                          : 'border-slate-200/80 bg-[#F5F6F8] text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[11px] font-bold num">{fmtSeconds(p.seconds)}</span>
                      <span className={`text-[10px] num ${isActive ? 'text-cyan-600 font-bold' : 'text-slate-400'}`}>
                        {fmtPayout(p.payoutRate)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 投入本金输入框 */}
            <Field label={t('option.investAmount', '投入本金')} unit={settlementCoin}>
              <input
                type="number"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  setPercent(0);
                }}
                placeholder="0.00"
                className="w-full bg-transparent text-[15px] font-bold text-slate-900 placeholder:text-slate-300 border-none outline-none shadow-none focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 p-0 m-0 num leading-tight"
              />
              <button
                type="button"
                onClick={() => {
                  setPercent(100);
                  setAmountInput(available);
                }}
                className="rounded-full bg-slate-200/80 hover:bg-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-600 transition cursor-pointer shrink-0"
              >
                MAX
              </button>
            </Field>

            {/* 百分比快捷仓位按钮 (椭圆胶囊按键) */}
            <div className="mb-2.5 grid grid-cols-4 gap-1.5">
              {[25, 50, 75, 100].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPercent(p);
                    const n = (Number(available) * p) / 100;
                    setAmountInput(n.toFixed(2));
                  }}
                  className={`h-7 rounded-full text-xs font-semibold num transition cursor-pointer border ${
                    percent === p
                      ? direction === 1
                        ? 'bg-[#00B578] text-white border-[#00B578] shadow-2xs'
                        : 'bg-[#FF4D4F] text-white border-[#FF4D4F] shadow-2xs'
                      : 'bg-[#F5F6F8] text-slate-600 border-slate-200/80 hover:bg-slate-200/70'
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>

            {/* 资产可用与预估收益 */}
            <div className="space-y-1 mb-2.5 pt-1.5 border-t border-slate-100 text-[11px]">
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1">
                  {t('option.currentBalance', '可用余额')}
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
                  {Number(available).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {settlementCoin}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>{t('option.profit', '预估收益')}</span>
                <span className="font-bold text-[#00B578] num tabular-nums">
                  +{Number(amountInput || 0) > 0 ? (Number(amountInput) * Number(currentPayout)).toFixed(2) : '0.00'} {settlementCoin}
                </span>
              </div>
            </div>

            {/* 下单主按钮 (椭圆形金融大按键) */}
            <button
              disabled={placing}
              onClick={() => handlePlace(direction)}
              className={`h-11 w-full rounded-full text-[13px] font-bold text-white shadow-xs disabled:opacity-50 transition active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer ${
                direction === 1
                  ? 'bg-[#00B578] hover:bg-[#009e69]'
                  : 'bg-[#FF4D4F] hover:bg-[#e04345]'
              }`}
            >
              {placing ? (
                '...'
              ) : direction === 1 ? (
                <>
                  <TrendingUp size={15} strokeWidth={2.5} />
                  <span>{t('option.confirmCall', '看涨下单')} · {fmtSeconds(pickedPeriod)}</span>
                </>
              ) : (
                <>
                  <TrendingDown size={15} strokeWidth={2.5} />
                  <span>{t('option.confirmPut', '看跌下单')} · {fmtSeconds(pickedPeriod)}</span>
                </>
              )}
            </button>
          </div>

          {/* 右栏：深度盘口 */}
          <div className="min-w-0 flex flex-col justify-between pl-1 border-l border-slate-100/80">
            <div>
              <Orderbook
                price={livePriceNum}
                precision={precision}
                precisionStep={bookPrecisionStep}
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

      {/* 4. 底栏：当前期权 / 历史期权 */}
      <section className="mt-2.5 bg-white px-4 py-3 border-y border-slate-100/90 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex gap-6 text-xs font-semibold">
            {(['running', 'history'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`relative pb-1.5 transition cursor-pointer ${
                  tab === k ? 'text-cyan-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {k === 'running' ? `${t('option.optionOrders')} (${visibleRunning.length})` : t('finance.historyOrders')}
                {tab === k && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-cyan-600" />
                )}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyCurrentSymbol}
              onChange={(e) => setOnlyCurrentSymbol(e.target.checked)}
              className="h-3.5 w-3.5 rounded-[2px] accent-cyan-600"
            />
            <span>{t('common.currentSymbol')}</span>
          </label>
        </div>

        <div className="mt-3">
          {tab === 'running' ? (
            <RunningListClean key={tick} rows={visibleRunning} />
          ) : (
            <HistoryListClean rows={visibleHistory} />
          )}
        </div>
      </section>

      <SymbolDrawer
        open={drawerOpen}
        tradeType="option"
        onClose={() => setDrawerOpen(false)}
        onPick={(row) => {
          setCurrent(row);
          setDrawerOpen(false);
        }}
      />
      {timePickerOpen && (
        <TimePickerSheet
          value={scheduledAt}
          onCancel={() => setTimePickerOpen(false)}
          onConfirm={(next) => {
            setScheduledAt(next);
            setTimePickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

function compactOptionNumber(value: string | number | null | undefined): string {
  const n = Number(value);
  if (!isFinite(n)) return '--';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

function OptionPcTopStat({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-[100px] text-[11px] leading-[15px]">
      <div className="truncate text-textSubPc">{label}</div>
      <div className={`pc-price font-semibold text-text ${className}`}>{value}</div>
    </div>
  );
}

function OptionPcMarketList({
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
          const price = Number(row.price);
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
                <span className="pc-price block text-[12px] font-semibold text-text">
                  {isFinite(price) ? price.toLocaleString('en-US', { maximumFractionDigits: row.pricePrecision }) : '--'}
                </span>
                <span className="text-[10px] text-textSubPc">{compactOptionNumber(row.volume)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function OptionPcOrderPanel({
  tradeMode,
  setTradeMode,
  direction,
  setDirection,
  periods,
  pickedPeriod,
  setPickedPeriod,
  pickedPeriodLabel,
  setTimePickerOpen,
  scheduledAt,
  amountInput,
  setAmountInput,
  percent,
  setPercent,
  available,
  currentPayout,
  placing,
  handlePlace,
  minAmount,
  quoteCoin,
  settlementCoin,
}: {
  tradeMode: 'instant' | 'timed';
  setTradeMode: (value: 'instant' | 'timed') => void;
  direction: 1 | 2;
  setDirection: (value: 1 | 2) => void;
  periods: OptionPeriod[];
  pickedPeriod: number;
  setPickedPeriod: (value: number) => void;
  pickedPeriodLabel: string;
  timePickerOpen: boolean;
  setTimePickerOpen: (value: boolean) => void;
  scheduledAt: Date;
  amountInput: string;
  setAmountInput: (value: string) => void;
  percent: number;
  setPercent: (value: number) => void;
  available: string;
  currentPayout: string;
  placing: boolean;
  handlePlace: (direction: 1 | 2) => void;
  minAmount: number;
  quoteCoin: string;
  settlementCoin: string;
}) {
  const { t } = useTranslation();
  const setAmountByPercent = (value: number) => {
    setPercent(value);
    setAmountInput(((Number(available) * value) / 100).toFixed(2));
  };

  return (
    <div className="pc-trade-form pc-trade-form-option text-[12px]">
      <div className="pc-trade-form-tabs mb-2 grid grid-cols-2 gap-1 rounded bg-bgSection p-1">
        <button className={`h-7 rounded font-semibold ${tradeMode === 'instant' ? 'bg-text text-white' : 'text-textSubPc'}`} onClick={() => setTradeMode('instant')}>
          {t('option.instantTrade')}
        </button>
        <button className={`h-7 rounded font-semibold ${tradeMode === 'timed' ? 'bg-text text-white' : 'text-textSubPc'}`} onClick={() => setTradeMode('timed')}>
          {t('option.timedTrade')}
        </button>
      </div>
      <div className="pc-trade-action-grid mb-2 grid grid-cols-2 gap-1">
        <button onClick={() => setDirection(1)} className={`h-8 rounded font-semibold ${direction === 1 ? 'bg-up text-white' : 'bg-bgSection text-textSubPc'}`}>
          {t('option.up')}
        </button>
        <button onClick={() => setDirection(2)} className={`h-8 rounded font-semibold ${direction === 2 ? 'bg-down text-white' : 'bg-bgSection text-textSubPc'}`}>
          {t('option.down')}
        </button>
      </div>
      <div className="mb-2 text-textSubPc">{t('option.tradeInterval', { value: pickedPeriodLabel })}</div>
      <div className="pc-trade-period-grid mb-2 grid grid-cols-4 gap-1">
        {periods.slice(0, 8).map((item) => (
          <button
            key={item.seconds}
            onClick={() => setPickedPeriod(item.seconds)}
            className={`h-7 rounded text-[11px] ${pickedPeriod === item.seconds ? 'bg-text text-white' : 'bg-bgSection text-textSubPc'}`}
          >
            {fmtSeconds(item.seconds)}
          </button>
        ))}
      </div>
      {tradeMode === 'timed' ? (
        <button className="pc-trade-select mb-2 flex h-8 w-full items-center justify-between rounded bg-bgSection px-2" onClick={() => setTimePickerOpen(true)}>
          <span>{t('option.selectTime')}</span>
          <span className="num">
            {scheduledAt.getHours().toString().padStart(2, '0')}:{scheduledAt.getMinutes().toString().padStart(2, '0')}
          </span>
        </button>
      ) : null}
      <SoftField>
        <input
          type="number"
          inputMode="decimal"
          value={amountInput}
          onChange={(e) => {
            setAmountInput(e.target.value);
            setPercent(0);
          }}
          placeholder={t('option.investAmount')}
          className="w-full bg-transparent text-[12px] outline-none num placeholder:text-textSubPc"
        />
      </SoftField>
      <div className="pc-trade-percent mb-3 mt-3">
        <div className="relative mx-1 h-3">
          <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-line" />
          {PERCENTS.map((item) => (
            <button
              key={item}
              onClick={() => setAmountByPercent(item)}
              className={`absolute top-0 h-3 w-3 -translate-x-1/2 rounded-full border ${percent === item ? 'border-text bg-text' : 'border-line bg-bg'}`}
              style={{ left: `${item}%` }}
              aria-label={`${item}%`}
            />
          ))}
        </div>
        <div className="mt-1 grid grid-cols-5 text-[10px] text-textSubPc">
          {PERCENTS.map((item) => (
            <button key={item} onClick={() => setAmountByPercent(item)}>{item === 0 ? '0' : `${item}%`}</button>
          ))}
        </div>
      </div>
      <div className="mb-2 flex justify-between text-textSubPc">
        <span>{t('option.currentBalance')}</span>
        <span className="pc-price text-text">{available} {settlementCoin}</span>
      </div>
      <div className="mb-2 flex justify-between text-textSubPc">
        <span>{t('option.minBuy')}</span>
        <span className="pc-price text-text">{minAmount} {settlementCoin}</span>
      </div>
      <div className="mb-3 rounded bg-bgSection px-2 py-2 text-textSubPc">
        <div className="flex justify-between">
          <span>{t('option.payout')}</span>
          <span className="font-semibold text-up">{fmtPayout(currentPayout)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span>{t('option.profit')}</span>
          <span className="font-semibold text-up">
            +{Number(amountInput || 0) > 0 ? (Number(amountInput) * Number(currentPayout)).toFixed(2) : '0.00'} {settlementCoin}
          </span>
        </div>
      </div>
      <button
        disabled={placing}
        onClick={() => handlePlace(direction)}
        className={`h-9 w-full rounded text-[13px] font-bold text-white disabled:opacity-60 ${direction === 1 ? 'bg-up' : 'bg-down'}`}
      >
        {direction === 1 ? t('option.up') : t('option.down')}
      </button>
    </div>
  );
}

function SoftField({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 flex h-10 items-center rounded-lg bg-bgSoft px-3">
      {children}
    </div>
  );
}

const Field: React.FC<{ label: string; unit: string; children: React.ReactNode }> = ({
  label,
  unit,
  children,
}) => (
  <div className="mb-2 rounded-[8px] bg-[#F5F6F8] border border-slate-200/80 px-3 py-1.5 focus-within:border-cyan-500 focus-within:bg-white transition-all">
    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
      <span>{label}</span>
      <span>{unit}</span>
    </div>
    <div className="mt-0.5 flex items-center justify-between gap-2">
      {children}
    </div>
  </div>
);

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
function TimePickerSheet({
  value,
  onCancel,
  onConfirm,
}: {
  value: Date;
  onCancel: () => void;
  onConfirm: (value: Date) => void;
}) {
  const { t } = useTranslation();
  const { isPc } = useResponsive();
  const [draft, setDraft] = useState(() => new Date(value));

  // 防止滚动穿透
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // 为移动端准备选项数据
  const yearOptions = Array.from({ length: 10 }, (_, i) => (2026 + i).toString());
  const monthOptions = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
  const daysInMonth = getDaysInMonth(draft.getFullYear(), draft.getMonth() + 1);
  const dayOptions = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const [pickerValue, setPickerValue] = useState({
    year: draft.getFullYear().toString(),
    month: (draft.getMonth() + 1).toString().padStart(2, '0'),
    day: draft.getDate().toString().padStart(2, '0'),
    hour: draft.getHours().toString().padStart(2, '0'),
    minute: draft.getMinutes().toString().padStart(2, '0'),
  });

  const handlePickerChange = (newValue: typeof pickerValue) => {
    setPickerValue(newValue);

    // 更新 draft
    const year = parseInt(newValue.year);
    const month = parseInt(newValue.month);
    const day = parseInt(newValue.day);
    const hour = parseInt(newValue.hour);
    const minute = parseInt(newValue.minute);

    const newDate = new Date(year, month - 1, day, hour, minute, 0, 0);
    setDraft(newDate);
  };

  const setPart = (part: 'year' | 'month' | 'day' | 'hour' | 'minute', next: number) => {
    setDraft((old) => {
      const d = new Date(old);
      if (part === 'year') d.setFullYear(next);
      if (part === 'month') d.setMonth(next - 1);
      if (part === 'day') d.setDate(next);
      if (part === 'hour') d.setHours(next);
      if (part === 'minute') d.setMinutes(next);
      d.setSeconds(0, 0);
      return d;
    });
  };

  const buildOptions = (current: number, min: number, max: number) => {
    const size = max - min + 1;
    return [-1, 0, 1, 2].map((offset) => {
      const raw = current + offset;
      if (raw < min) return max - ((min - raw - 1) % size);
      if (raw > max) return min + ((raw - max - 1) % size);
      return raw;
    });
  };

  const column = (items: number[], current: number, onPick: (v: number) => void, pad = false) => (
    <div className="flex-1 text-center">
      {items.map((item) => (
        <button
          key={`${item}-${pad}`}
          onClick={() => onPick(item)}
          className={`block h-11 w-full text-lg num ${item === current ? 'font-semibold text-text' : 'text-text'}`}
        >
          {pad ? item.toString().padStart(2, '0') : item}
        </button>
      ))}
    </div>
  );

  const year = draft.getFullYear();
  const month = draft.getMonth() + 1;
  const day = draft.getDate();
  const hour = draft.getHours();
  const minute = draft.getMinutes();

  // PC端使用原有的滚动选择器
  if (isPc) {
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-black/65">
        <div className="aster-bottom-sheet absolute bottom-0 left-0 right-0 mx-auto max-w-md rounded-t-xl bg-bg px-4 pb-safe pt-4 shadow-pop">
          <div className="mb-4 flex items-center justify-between text-base">
            <button onClick={onCancel}>{t('common.cancel')}</button>
            <div className="font-bold">{t('option.selectTime')}</div>
            <button onClick={() => onConfirm(draft)}>{t('common.confirm')}</button>
          </div>
          <div className="relative">
            <div className="absolute left-0 right-0 top-11 h-11 rounded-lg bg-bgSoft" />
            <div className="relative flex gap-1">
              {column(buildOptions(year, 2026, 2035), year, (v) => setPart('year', v))}
              {column(buildOptions(month, 1, 12), month, (v) => setPart('month', v), true)}
              {column(buildOptions(Math.min(day, daysInMonth), 1, daysInMonth), Math.min(day, daysInMonth), (v) => setPart('day', v), true)}
              {column(buildOptions(hour, 0, 23), hour, (v) => setPart('hour', v), true)}
              {column(buildOptions(minute, 0, 59), minute, (v) => setPart('minute', v), true)}
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // 移动端使用 react-mobile-picker
  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/65"
      onClick={onCancel}
      onTouchMove={(e) => e.preventDefault()}
    >
      <div
        className="aster-bottom-sheet absolute bottom-0 left-0 right-0 mx-auto max-w-md rounded-t-xl bg-bg px-4 pb-safe pt-4 shadow-pop"
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between text-base">
          <button onClick={onCancel}>{t('common.cancel')}</button>
          <div className="font-bold">{t('option.selectTime')}</div>
          <button onClick={() => onConfirm(draft)}>{t('common.confirm')}</button>
        </div>
        <div className="relative pb-4">
          <Picker
            value={pickerValue}
            onChange={handlePickerChange}
            wheelMode="natural"
            height={216}
          >
            <Picker.Column name="year">
              {yearOptions.map((option) => (
                <Picker.Item key={option} value={option}>
                  {({ selected }) => (
                    <div className={`text-center text-base num ${selected ? 'font-semibold text-text' : 'text-textSub'}`}>
                      {option}
                    </div>
                  )}
                </Picker.Item>
              ))}
            </Picker.Column>
            <Picker.Column name="month">
              {monthOptions.map((option) => (
                <Picker.Item key={option} value={option}>
                  {({ selected }) => (
                    <div className={`text-center text-base num ${selected ? 'font-semibold text-text' : 'text-textSub'}`}>
                      {option}
                    </div>
                  )}
                </Picker.Item>
              ))}
            </Picker.Column>
            <Picker.Column name="day">
              {dayOptions.map((option) => (
                <Picker.Item key={option} value={option}>
                  {({ selected }) => (
                    <div className={`text-center text-base num ${selected ? 'font-semibold text-text' : 'text-textSub'}`}>
                      {option}
                    </div>
                  )}
                </Picker.Item>
              ))}
            </Picker.Column>
            <Picker.Column name="hour">
              {hourOptions.map((option) => (
                <Picker.Item key={option} value={option}>
                  {({ selected }) => (
                    <div className={`text-center text-base num ${selected ? 'font-semibold text-text' : 'text-textSub'}`}>
                      {option}
                    </div>
                  )}
                </Picker.Item>
              ))}
            </Picker.Column>
            <Picker.Column name="minute">
              {minuteOptions.map((option) => (
                <Picker.Item key={option} value={option}>
                  {({ selected }) => (
                    <div className={`text-center text-base num ${selected ? 'font-semibold text-text' : 'text-textSub'}`}>
                      {option}
                    </div>
                  )}
                </Picker.Item>
              ))}
            </Picker.Column>
          </Picker>
        </div>
      </div>
    </div>,
    document.body
  );
}


function RunningList({ rows }: { rows: OptionOrder[] }) {
  const { t } = useTranslation();
  if (!rows.length) {
    return <EmptyState title={t('option.noData')} />;
  }
  const now = Date.now();
  return (
    <div className="space-y-2 py-2">
      {rows.map((r) => {
        const settleTs = r.settleAt ? new Date(r.settleAt).getTime() : 0;
        const remain = settleTs > 0 ? Math.max(0, Math.ceil((settleTs - now) / 1000)) : 0;
        const dirUp = r.direction === 1;
        const scheduled = r.status === 2;
        const quoteCoin = r.symbol.split('-')[1] || 'USDT';
        return (
          <div
            key={r.id}
            className="flex items-center justify-between rounded border border-line bg-bgSoft px-3 py-2 text-xs"
          >
            <div>
              <div className="font-semibold">
                {r.symbol}{' '}
                <span className={dirUp ? 'text-up' : 'text-down'}>
                  {dirUp ? t('option.up') : t('option.down')}
                </span>
              </div>
              <div className="text-textSub">
                {scheduled ? t('option.waitingOpen') : `${t('option.openPrice')}: ${r.openPrice ?? '--'}`} · {Number(r.amount).toFixed(2)} USDT
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-base text-primary">
                {scheduled ? t('option.pendingOpen') : `${remain}s`}
              </div>
              <div className="text-textSub">{r.periodSeconds}s · {fmtPayout(r.payoutRate)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryList({ rows }: { rows: OptionOrder[] }) {
  const { t } = useTranslation();
  if (!rows.length) {
    return <EmptyState title={t('option.noData')} />;
  }
  return (
    <div className="space-y-2 py-2">
      {rows.map((r) => {
        const win = r.result === 1;
        const draw = r.result === 3;
        const dirUp = r.direction === 1;
        const profitNum = Number(r.profit ?? 0);
        const quoteCoin = r.symbol.split('-')[1] || 'USDT';
        return (
          <div
            key={r.id}
            className="flex items-center justify-between rounded border border-line bg-bgSoft px-3 py-2 text-xs"
          >
            <div>
              <div className="font-semibold">
                {r.symbol}{' '}
                <span className={dirUp ? 'text-up' : 'text-down'}>
                  {dirUp ? t('option.up') : t('option.down')}
                </span>{' '}
                <span className="text-textSub">{r.periodSeconds}s</span>
              </div>
              <div className="text-textSub">
                {r.openPrice} → {r.settlePrice ?? '--'} · {Number(r.amount).toFixed(2)} USDT
              </div>
            </div>
            <div className="text-right">
              <div
                className={`font-semibold ${
                  win ? 'text-up' : draw ? 'text-textSub' : 'text-down'
                }`}
              >
                {/* {win ? t('option.resultWin') : draw ? t('option.resultDraw') : t('option.resultLose')} */}
                {win ? `Profit` : draw ? t('option.resultDraw') : t('option.resultLose')}
              </div>
              <div className={`font-mono ${profitNum >= 0 ? 'text-up' : 'text-down'}`}>
                {profitNum >= 0 ? '+' : ''}
                {profitNum.toFixed(2)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RunningListClean({ rows }: { rows: OptionOrder[] }) {
  const { t } = useTranslation();
  if (!rows.length) {
    return <EmptyState title={t('option.noData')} />;
  }
  const now = Date.now();
  return (
    <div className="space-y-2 py-2">
      {rows.map((row) => {
        const settleTs = row.settleAt ? new Date(row.settleAt).getTime() : 0;
        const remain = settleTs > 0 ? Math.max(0, Math.ceil((settleTs - now) / 1000)) : 0;
        const dirUp = row.direction === 1;
        const scheduled = row.status === 2;
        const quoteCoin = row.settlementCoin || 'USDT';
        return (
          <div
            key={row.id}
            className="flex items-center justify-between rounded border border-line bg-bgSoft px-3 py-2 text-xs"
          >
            <div>
              <div className="font-semibold">
                {row.symbol}{' '}
                <span className={dirUp ? 'text-up' : 'text-down'}>
                  {dirUp ? t('option.up') : t('option.down')}
                </span>
              </div>
              <div className="text-textSub">
                {scheduled ? t('option.waitingOpen') : `${t('option.openPrice')}: ${row.openPrice ?? '--'}`} · {Number(row.amount).toFixed(2)} {quoteCoin}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-base text-primary">
                {scheduled ? t('option.pendingOpen') : `${remain}s`}
              </div>
              <div className="text-textSub">{row.periodSeconds}s · {fmtPayout(row.payoutRate)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryListClean({ rows }: { rows: OptionOrder[] }) {
  const { t } = useTranslation();
  if (!rows.length) {
    return <EmptyState title={t('option.noData')} />;
  }
  return (
    <div className="space-y-2 py-2">
      {rows.map((row) => {
        const win = row.result === 1;
        const draw = row.result === 3;
        const dirUp = row.direction === 1;
        const profitNum = Number(row.profit ?? 0);
        const quoteCoin = row.settlementCoin || 'USDT';
        return (
          <div
            key={row.id}
            className="flex items-center justify-between rounded border border-line bg-bgSoft px-3 py-2 text-xs"
          >
            <div>
              <div className="font-semibold">
                {row.symbol}{' '}
                <span className={dirUp ? 'text-up' : 'text-down'}>
                  {dirUp ? t('option.up') : t('option.down')}
                </span>{' '}
                <span className="text-textSub">{row.periodSeconds}s</span>
              </div>
              <div className="text-textSub">
                {row.openPrice} → {row.settlePrice ?? '--'} · {Number(row.amount).toFixed(2)} {quoteCoin}
              </div>
            </div>
            <div className="text-right">
              <div
                className={`font-semibold ${
                  win ? 'text-up' : draw ? 'text-textSub' : 'text-down'
                }`}
              >
                
                {/* {win ? t('option.resultWin') : draw ? t('option.resultDraw') : t('option.resultLose')} */}
                {win ? `Profit` : draw ? t('option.resultDraw') : t('option.resultLose')}
              </div>
              <div className={`font-mono ${profitNum >= 0 ? 'text-up' : 'text-down'}`}>
                {profitNum >= 0 ? '+' : ''}
                {profitNum.toFixed(2)} {quoteCoin}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
