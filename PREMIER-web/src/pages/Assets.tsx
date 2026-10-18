import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  ArrowDown,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpFromLine,
  Award,
  BookOpen,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  History,
  Image as ImageIcon,
  Monitor,
  PiggyBank,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  fetchCoinListCached,
  fetchOverview,
  fetchOverviewCached,
  getCoinListCacheSnapshot,
  getOverviewCacheSnapshot,
  type AccountVO,
  type AssetOverview,
  type CoinInfo,
} from '@/api/asset';
import { fetchMyNftCountCached, getMyNftCountCacheSnapshot } from '@/api/nft';
import { useUserStore } from '@/store/userStore';
import {
  ASSET_COINS,
  CoinIcon,
  formatUsd,
} from './asset/assetShared';
import { useResponsive } from '@/hooks/useResponsive';
import {
  PcAssetActionButton,
  PcAssetAmount,
  PcAssetEmpty,
  PcAssetLayout,
  PcAssetTitle,
  PcAssetTrend,
} from './asset/PcAssetLayout';

const ACCOUNT_CARDS = [
  { type: 1, labelKey: 'asset.spotAcc', icon: UserRound },
  { type: 2, labelKey: 'asset.tradeAcc', icon: Monitor },
  { type: 3, labelKey: 'asset.financeAcc', icon: PiggyBank },
];

export default function AssetsPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { isPc } = useResponsive();
  const token = useUserStore((s) => s.token);
  const [data, setData] = useState<AssetOverview | null>(() => getOverviewCacheSnapshot());
  const [coins, setCoins] = useState<CoinInfo[]>(() => getCoinListCacheSnapshot() ?? []);
  // 隐藏金额≤1USD的币种：首次进入默认隐藏（默认勾选），并支持持久化存储
  const [hideSmall, setHideSmall] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('coinex_assets_hide_small');
      if (saved !== null) return saved === 'true';
    }
    return true; // 首次进入默认隐藏 (默认勾选)
  });

  const toggleHideSmall = (checked: boolean) => {
    setHideSmall(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('coinex_assets_hide_small', String(checked));
    }
  };

  // 资产总览默认隐藏金额（可通过眼睛图标一键显隐）
  const [showVal, setShowVal] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('coinex_assets_show_val');
      if (saved !== null) return saved === 'true';
    }
    return false;
  });
  const [activeTab, setActiveTab] = useState<'all' | 'hasBalance' | 'spot' | 'trade'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [nftCount, setNftCount] = useState(() => getMyNftCountCacheSnapshot() ?? 0);

  const toggleShowVal = () => {
    setShowVal((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('coinex_assets_show_val', String(next));
      }
      return next;
    });
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = (force = false) =>
      (force ? fetchOverview(true) : fetchOverviewCached())
        .then((next) => {
          if (!cancelled) {
            setData(next);
          }
        })
        .catch(() => {});

    load(false);
    fetchCoinListCached().then((rows) => setCoins(rows ?? [])).catch(() => {});
    fetchMyNftCountCached().then((total) => !cancelled && setNftCount(total)).catch(() => !cancelled && setNftCount(0));
    const timer = window.setInterval(() => {
      void load(true);
    }, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token]);

  const rows = useMemo(() => buildRows(data, coins, ASSET_COINS, hideSmall), [data, coins, hideSmall]);
  const filteredRows = useMemo(() => {
    let list = rows;
    if (activeTab === 'hasBalance') {
      list = list.filter((r) => Number(r.available) > 0 || Number(r.valuation) > 0);
    } else if (activeTab === 'spot') {
      list = list.filter((r) => r.accountType === 1 || r.accountType === 0);
    } else if (activeTab === 'trade') {
      list = list.filter((r) => r.accountType === 2);
    }

    if (!searchKeyword.trim()) return list;
    const kw = searchKeyword.trim().toUpperCase();
    return list.filter((r) => r.coin.toUpperCase().includes(kw) || coinFullName(r.coin).toUpperCase().includes(kw));
  }, [rows, searchKeyword, activeTab]);

  const coinLogoMap = useMemo(
    () => new Map(coins.map((item) => [item.code, item.logo ?? null])),
    [coins]
  );

  const totalVal = Number(data?.totalUsd ?? 0);
  const spotVal = Number(data?.spotTotalUsd ?? 0);
  const tradeVal = Number(data?.tradeTotalUsd ?? 0);
  const financeVal = Number(data?.financeTotalUsd ?? 0);

  const spotPct = totalVal > 0 ? Math.min(100, Math.max(0, (spotVal / totalVal) * 100)) : 0;
  const tradePct = totalVal > 0 ? Math.min(100 - spotPct, Math.max(0, (tradeVal / totalVal) * 100)) : 0;
  const financePct = totalVal > 0 ? Math.min(100 - spotPct - tradePct, Math.max(0, (financeVal / totalVal) * 100)) : 0;

  const profit = Number(data?.todayProfit ?? 0);
  const profitSign = profit >= 0 ? '+' : '';

  const btcPrice = useMemo(() => {
    const btc = rows.find((r) => r.coin === 'BTC');
    const p = Number(btc?.price || 0);
    return p > 0 ? p : 77231;
  }, [rows]);
  const btcVal = totalVal > 0 ? (totalVal / btcPrice).toFixed(4) : '0.0000';
  const cnyVal = useMemo(() => {
    return totalVal > 0
      ? (totalVal * 7.25).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '0.00';
  }, [totalVal]);

  if (isPc) {
    const distRows = [
      { type: 1, labelKey: 'asset.spotAcc', value: data?.spotTotalUsd, icon: UserRound },
      { type: 2, labelKey: 'asset.tradeAcc', value: data?.tradeTotalUsd, icon: Monitor },
      { type: 3, labelKey: 'asset.financeAcc', value: data?.financeTotalUsd, icon: PiggyBank },
    ];
    return (
      <PcAssetLayout active="overview">
        <div className="w-full space-y-8">
          {/* Top section: Balance, Actions, Trend & Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 w-full">
            <div className="min-w-0">
              <PcAssetTitle
                title={t('asset.total')}
                showVal={showVal}
                onToggleEye={toggleShowVal}
              />
              <PcAssetAmount value={data?.totalUsd ?? '0'} showVal={showVal} />
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <PcAssetActionButton active onClick={() => nav('/assets/deposit')} icon={<ArrowDownToLine size={14} />}>
                  {t('asset.deposit')}
                </PcAssetActionButton>
                <PcAssetActionButton onClick={() => nav('/assets/withdraw')} icon={<ArrowUpFromLine size={14} />}>
                  {t('asset.withdraw')}
                </PcAssetActionButton>
                <PcAssetActionButton onClick={() => nav('/assets/flash')} icon={<Zap size={14} />}>
                  {t('asset.flash')}
                </PcAssetActionButton>
                <PcAssetActionButton onClick={() => nav('/assets/transfer')} icon={<ArrowLeftRight size={14} />}>
                  {t('asset.transfer')}
                </PcAssetActionButton>
                <PcAssetActionButton onClick={() => nav('/assets/bill')} icon={<FileText size={14} />}>
                  {t('asset.bill')}
                </PcAssetActionButton>
              </div>

              <div className="mt-8 rounded-2xl border border-line/70 bg-card p-5 shadow-sm">
                <PcAssetTrend />
              </div>
            </div>

            <aside className="w-full lg:w-[320px]">
              <h2 className="mb-4 text-[15px] font-bold text-text">{t('asset.assetDistribution')}</h2>
              <div className="space-y-3">
                {distRows.map(({ type, labelKey, value, icon: Icon }) => {
                  const pct = Number(data?.totalUsd ?? 0) > 0 ? ((Number(value ?? 0) / Number(data?.totalUsd)) * 100).toFixed(2) : '0.00';
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => nav(`/assets/account/${type}`)}
                      className="group w-full rounded-2xl border border-line/70 bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[13px] font-semibold text-text group-hover:text-primary transition">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon size={14} />
                          </span>
                          {t(labelKey)}
                        </div>
                        <span className="text-[12px] font-bold text-primary">{pct}%</span>
                      </div>
                      <div className="num mt-2.5 text-[18px] font-bold text-text tabular-nums">
                        {showVal ? `$${formatUsd(value, 0)}` : '****'}
                      </div>
                      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#00C4DF] to-[#0284C7] transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, Number(pct)))}%` }}
                        />
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-textSubPc">
                        <span>{t('asset.today')} {showVal ? '$0.00' : '****'}</span>
                        <span>{t('asset.estimateRatio')} {pct}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>

          {/* Overview List Table */}
          <section className="w-full rounded-2xl border border-line/70 bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-line/60 pb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-[16px] font-bold text-text">{t('asset.overview')}</h2>
                <button
                  type="button"
                  onClick={toggleShowVal}
                  className="text-textSubPc hover:text-text cursor-pointer inline-flex items-center transition"
                  title={showVal ? t('asset.hideAmount', '隐藏金额') : t('asset.showAmount', '显示金额')}
                >
                  {showVal ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-textSubPc cursor-pointer hover:text-text transition">
                <input type="checkbox" checked={hideSmall} onChange={(e) => toggleHideSmall(e.target.checked)} className="rounded accent-primary" />
                {t('asset.hideLtUsd')}
              </label>
            </div>
            <div className="mt-4 grid grid-cols-[1.5fr_1fr_1fr_1fr] px-4 py-2 text-[12px] font-semibold text-textSubPc">
              <span>{t('asset.coin')}</span>
              <span>{t('asset.available')}</span>
              <span className="text-right">{t('asset.valueSpotPnl')}</span>
              <span className="text-right">{t('asset.totalProfit', '累计盈亏')}</span>
            </div>
            <div className="divide-y divide-line/40">
              {rows.map((row) => (
                <PcOverviewAssetRow key={row.coin} row={row} logo={coinLogoMap.get(row.coin)} showVal={showVal} />
              ))}
            </div>
          </section>

          {/* Asset Activity Section */}
          <section className="w-full rounded-2xl border border-line/70 bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-[16px] font-bold text-text">{t('asset.assetActivity')}</h2>
            <div className="flex min-h-[140px] items-center justify-center py-6 text-textSubPc">
              <PcAssetEmpty label={t('common.noData')} />
            </div>
          </section>
        </div>
      </PcAssetLayout>
    );
  }

  const headerActions = [
    { label: t('nav.deposit', '充值'), path: '/assets/deposit', icon: ArrowDown },
    { label: t('nav.withdraw', '提现'), path: '/assets/withdraw', icon: ArrowUp },
    { label: t('asset.flash', '闪兑'), path: '/assets/flash', icon: ArrowLeftRight },
    { label: t('nav.trade', '交易'), path: '/trade', icon: TrendingUp },
  ];

  const featureCards = [
    {
      title: t('nav.option', '期权'),
      subtitle: t('option.instantTrade', '急速交割'),
      badge: '60s',
      path: '/option',
      icon: Zap,
      bg: 'bg-[#e6fbfd]',
      textColor: 'text-[#00bcd4]',
      badgeBg: 'bg-[#e6fbfd] text-[#00bcd4] border-[#d0f5f9]',
      iconFill: 'fill-[#00bcd4]/20 stroke-[#00bcd4]',
    },
    {
      title: t('nav.perp', '合约'),
      subtitle: `100X ${t('perp.leverage', '杠杆')}`,
      badge: 'HOT',
      path: '/perp',
      icon: Activity,
      bg: 'bg-[#edf5ff]',
      textColor: 'text-[#007aff]',
      badgeBg: 'bg-[#edf5ff] text-[#007aff] border-[#d6e8ff]',
      iconFill: 'stroke-[#007aff] stroke-[2.2]',
    },
    {
      title: t('nav.finance', '理财'),
      subtitle: t('discover.stableYield', '稳健生息'),
      badge: 'APR+',
      path: '/finance',
      icon: Sparkles,
      bg: 'bg-[#ecfaf1]',
      textColor: 'text-[#00b578]',
      badgeBg: 'bg-[#ecfaf1] text-[#00b578] border-[#d4f6df]',
      iconFill: 'fill-[#00b578]/20 stroke-[#00b578]',
    },
    {
      title: t('home.follow', '跟随'),
      subtitle: t('home.strategist', '策略员'),
      badge: 'TOP',
      path: '/follow',
      icon: Award,
      bg: 'bg-[#f4effe]',
      textColor: 'text-[#7e57c2]',
      badgeBg: 'bg-[#f5f0ff] text-[#7e57c2] border-[#ebe0fe]',
      iconFill: 'fill-[#7e57c2]/20 stroke-[#7e57c2]',
    },
  ];

  return (
    <div className="aster-page pb-28 px-3.5 pt-2">
      {/* 1. 经典高亮渐变总资产卡片 (CoinEx Blue Gradient Card) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0082f6] via-[#0092f8] to-[#00a8fb] p-5 text-white shadow-lg shadow-blue-500/20">
        {/* 背景轻微光晕装饰 */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-cyan-300/15 blur-2xl" />

        <div className="relative z-10">
          {/* 顶行：标题、眼睛开关、今日收益徽标 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-medium text-white/95">
              <span>{t('asset.totalEstimated', '总资产折合')} (USDT)</span>
              <button
                type="button"
                onClick={toggleShowVal}
                className="flex items-center justify-center p-0.5 text-white/80 hover:text-white transition active:scale-95 cursor-pointer"
                title={showVal ? t('asset.hideAmount', '隐藏金额') : t('asset.showAmount', '显示金额')}
              >
                {showVal ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-white border border-white/10 shadow-xs">
              <TrendingUp size={12} className="stroke-[2.5]" />
              <span>
                {showVal
                  ? `${profit >= 0 ? '+' : '-'}${formatUsd(Math.abs(profit))} USDT`
                  : '****'}
              </span>
            </div>
          </div>

          {/* 金额数字 */}
          <div className="mt-3.5 flex items-baseline">
            <span className="text-[32px] sm:text-[36px] font-black tracking-tight text-white num leading-tight">
              {showVal ? formatUsd(data?.totalUsd ?? '0') : '******'}
            </span>
            <span className="text-sm sm:text-base font-bold text-white/90 ml-1.5">USDT</span>
          </div>

          {/* 法币预估折算 */}
          <div className="mt-1 text-xs text-white/80 font-normal num">
            ≈ ¥ {showVal ? cnyVal : '******'}
          </div>

          {/* 分割线 */}
          <div className="h-[1px] w-full bg-white/20 my-4" />

          {/* 4个圆形快捷操作按钮 */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {headerActions.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => nav(item.path)}
                  className="group flex flex-col items-center cursor-pointer active:scale-95 transition"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/20 shadow-sm transition">
                    <Icon size={22} className="stroke-[2.2]" />
                  </div>
                  <span className="mt-2 text-xs font-medium text-white tracking-tight">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. 2x2 快捷功能卡片 (期权、合约、理财、跟随) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mt-3.5">
        {featureCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              onClick={() => nav(card.path)}
              className="bg-white rounded-2xl p-3 border border-slate-100 shadow-xs flex items-center justify-between cursor-pointer active:scale-[0.98] hover:shadow-md transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full ${card.bg} ${card.textColor}`}>
                  <Icon size={19} className={card.iconFill} />
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] sm:text-[15px] font-bold text-slate-900 leading-tight">
                    {card.title}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                    {card.subtitle}
                  </div>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-bold border ml-1 ${card.badgeBg}`}>
                {card.badge}
              </span>
            </div>
          );
        })}
      </div>

      {/* 3. 资产总览 (Asset Overview with Search & Tabs) */}
      <section className="mt-3.5">
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          {/* 标题与隐藏小额 / 眼睛开关 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-gradient-to-b from-[#00C4DF] to-[#0284C7]" />
              <h3 className="text-sm font-bold text-slate-900">{t('asset.overview', '资产总览')}</h3>
              <button
                type="button"
                onClick={toggleShowVal}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title={showVal ? t('asset.hideAmount', '隐藏金额') : t('asset.showAmount', '显示金额')}
              >
                {showVal ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                {filteredRows.length}
              </span>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-slate-500 font-medium cursor-pointer select-none">
              <input
                className="h-3.5 w-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                type="checkbox"
                checked={hideSmall}
                onChange={(e) => toggleHideSmall(e.target.checked)}
              />
              <span>{t('asset.hideSmall', '隐藏金额≤1USD的币种')}</span>
            </label>
          </div>

          {/* 快捷分类选项卡 (Filter Tabs) */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            {[
              { key: 'all', label: t('common.all', '全部') },
              { key: 'hasBalance', label: t('asset.hasBalance', '有余额') },
              { key: 'spot', label: t('nav.spot', '现货') },
              { key: 'trade', label: t('nav.trade', '交易') },
            ].map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200/70'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 搜索过滤框 */}
          <div className="mt-3 relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder={t('asset.searchCoin', '搜索币种...')}
              className="h-9 w-full rounded-xl bg-slate-50 pl-9 pr-8 text-xs font-medium text-slate-800 placeholder-slate-400 border border-slate-100 focus:border-cyan-500 focus:bg-white focus:outline-none transition"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* 表头 */}
          <div className="mt-3 grid grid-cols-2 border-b border-slate-100 pb-2 text-[11px] font-bold uppercase text-slate-400">
            <span>{t('asset.nameAmount', '名称 / 可用')}</span>
            <span className="text-right">{t('asset.valueSpotPnl', '估值 / 收益')}</span>
          </div>

          {/* 币种列表 */}
          <div
            className="scrollbar-none max-h-[min(52vh,480px)] overflow-y-auto overscroll-contain divide-y divide-slate-50"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {filteredRows.length > 0 ? (
              filteredRows.map((row) => (
                <AssetRow
                  key={row.coin}
                  row={row}
                  logo={coinLogoMap.get(row.coin)}
                  showVal={showVal}
                  onAction={(coin) => setSelectedCoin(coin)}
                />
              ))
            ) : (
              <div className="py-10 text-center text-xs text-slate-400">{t('common.noData', '暂无币种数据')}</div>
            )}
          </div>
        </div>
      </section>

      {/* 4. 常用服务与快捷工具 (Quick Services & Utilities) */}
      <section className="mt-3.5">
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-gradient-to-b from-[#00C4DF] to-[#0284C7]" />
              <h3 className="text-sm font-bold text-slate-900">{t('asset.quickServices', '快捷服务')}</h3>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <button
              type="button"
              onClick={() => nav('/assets/address')}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 transition active:scale-95 cursor-pointer"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100/60 shadow-xs">
                <BookOpen size={18} />
              </span>
              <span className="text-[11px] font-semibold text-slate-700">{t('asset.addressBook', '地址簿')}</span>
            </button>

            <button
              type="button"
              onClick={() => nav('/assets/bill')}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 transition active:scale-95 cursor-pointer"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/60 shadow-xs">
                <History size={18} />
              </span>
              <span className="text-[11px] font-semibold text-slate-700">{t('asset.financialDetails', '财务明细')}</span>
            </button>

            <button
              type="button"
              onClick={() => nav('/assets/nft/manage')}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 transition active:scale-95 cursor-pointer"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100/60 shadow-xs">
                <ImageIcon size={18} />
              </span>
              <span className="text-[11px] font-semibold text-slate-700">{t('asset.myCollections', '我的藏品')}</span>
            </button>

            <button
              type="button"
              onClick={() => nav('/profile/security')}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-50 transition active:scale-95 cursor-pointer"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/60 shadow-xs">
                <ShieldCheck size={18} />
              </span>
              <span className="text-[11px] font-semibold text-slate-700">{t('nav.securityCenter', '安全中心')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 币种快捷操作弹层 (Coin Quick Action Modal) */}
      {selectedCoin && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 backdrop-blur-xs transition-opacity" onClick={() => setSelectedCoin(null)}>
          <div
            className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl border-t border-slate-100 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <CoinIcon coin={selectedCoin} logo={coinLogoMap.get(selectedCoin)} size={28} />
                <div>
                  <span className="text-base font-bold text-slate-900">{selectedCoin}</span>
                  <span className="ml-1.5 text-xs text-slate-400 font-medium">{coinFullName(selectedCoin)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCoin(null)}
                className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const coin = selectedCoin;
                  setSelectedCoin(null);
                  nav(`/trade?symbol=${coin}USDT`);
                }}
                className="flex items-center justify-center gap-2 h-11 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-sm active:scale-98 transition cursor-pointer"
              >
                <TrendingUp size={15} />
                <span>{t('asset.spotTrade', '现货交易')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const coin = selectedCoin;
                  setSelectedCoin(null);
                  nav(`/assets/deposit?coin=${coin}`);
                }}
                className="flex items-center justify-center gap-2 h-11 rounded-2xl bg-gradient-to-r from-[#00C4DF] to-[#0284C7] text-white text-xs font-bold shadow-sm active:scale-98 transition cursor-pointer"
              >
                <ArrowDownToLine size={15} />
                <span>{t('nav.deposit', '充值')} {selectedCoin}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const coin = selectedCoin;
                  setSelectedCoin(null);
                  nav(`/assets/withdraw?coin=${coin}`);
                }}
                className="flex items-center justify-center gap-2 h-11 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-800 text-xs font-bold hover:bg-slate-100 active:scale-98 transition cursor-pointer"
              >
                <ArrowUpFromLine size={15} />
                <span>{t('nav.withdraw', '提现')} {selectedCoin}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const coin = selectedCoin;
                  setSelectedCoin(null);
                  nav(`/assets/transfer?coin=${coin}`);
                }}
                className="flex items-center justify-center gap-2 h-11 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-800 text-xs font-bold hover:bg-slate-100 active:scale-98 transition cursor-pointer"
              >
                <ArrowLeftRight size={15} />
                <span>{t('asset.transferFunds', '划转资金')}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCoin(null)}
              className="mt-3 w-full h-10 rounded-xl bg-slate-100 text-xs font-semibold text-slate-500 hover:bg-slate-200/70 transition cursor-pointer"
            >
              {t('common.cancel', '取消')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PcOverviewAssetRow({ row, logo, showVal = false }: { row: AccountVO; logo?: string | null; showVal?: boolean }) {
  const valStr = showVal ? `$${formatUsd(row.valuation)}` : '****';
  const availableStr = showVal ? formatCoinAmount(row.available, row.coin) : '****';
  const frozenStr = showVal ? formatCoinAmount(row.frozen, row.coin) : '****';
  const valuation = Number(row.valuation ?? 0);
  const totalProfit = Number(row.totalProfit ?? 0);
  const profitRate = Number(row.profitRate ?? 0);
  const isPositive = totalProfit >= 0;
  const profitColor = isPositive ? 'text-[#00B578]' : 'text-[#FF4D4F]';
  const profitSign = isPositive ? '+' : '';
  const hasValue = valuation > 0;

  return (
    <div className="grid min-h-[54px] grid-cols-[1.2fr_1fr_1fr_1fr] items-center border-b border-line px-[16px] py-[9px] text-[13px] last:border-b-0 hover:bg-slate-50 transition">
      <div className="flex items-center gap-[12px]">
        <CoinIcon coin={row.coin} logo={logo} size={26} />
        <div>
          <div className="font-semibold text-text">{row.coin}</div>
          <div className="text-[10px] text-textSubPc">{coinFullName(row.coin)}</div>
        </div>
      </div>
      <div className="num pc-price">
        <div className="font-semibold text-text">{availableStr}</div>
        <div className="text-[10px] text-textSubPc">{showVal ? `Frozen ${frozenStr}` : 'Frozen ****'}</div>
      </div>
      <div className="num pc-price text-right font-semibold text-text" title={valStr}>{valStr}</div>
      <div className="num pc-price text-right">
        {hasValue && showVal ? (
          <>
            <div className={`font-semibold ${profitColor}`}>{profitSign}${formatUsd(totalProfit)}</div>
            <div className={`text-[10px] ${profitColor}`}>{profitSign}{profitRate.toFixed(2)}%</div>
          </>
        ) : (
          <div className="font-semibold text-textSubPc">--</div>
        )}
      </div>
    </div>
  );
}

function AssetRow({
  row,
  logo,
  showVal,
  onAction,
}: {
  row: AccountVO;
  logo?: string | null;
  showVal: boolean;
  onAction?: (coin: string) => void;
}) {
  const valStr = showVal ? `$${formatUsd(row.valuation)}` : '****';
  const availableStr = showVal ? formatCoinAmount(row.available, row.coin) : '****';
  const valuation = Number(row.valuation ?? 0);
  const totalProfit = Number(row.totalProfit ?? 0);
  const profitRate = Number(row.profitRate ?? 0);
  const isPositive = totalProfit >= 0;
  const profitSign = isPositive ? '+' : '';
  const hasValue = valuation > 0;

  return (
    <div
      onClick={() => onAction?.(row.coin)}
      className="flex min-w-0 items-center justify-between gap-3 py-3 px-1 transition hover:bg-slate-50/80 active:bg-slate-100/60 rounded-xl cursor-pointer"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <CoinIcon coin={row.coin} logo={logo} size={36} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-black text-slate-900 leading-tight tracking-tight">{row.coin}</span>
          </div>
          <div className="mt-0.5 text-[11px] leading-tight text-slate-400 font-medium truncate">
            {coinFullName(row.coin)}
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="num min-w-0 shrink break-all text-[15px] font-bold leading-tight tabular-nums text-slate-900">
          {valStr}
        </div>
        <div className="mt-1 flex items-center justify-end gap-1.5">
          <span className="num text-[11px] leading-tight text-slate-400 font-medium tabular-nums">
            {availableStr} {showVal ? row.coin : ''}
          </span>
          {hasValue && showVal && (
            <span
              className={`num inline-flex items-center rounded px-1.5 py-0.2 text-[10px] font-bold leading-tight ${
                isPositive ? 'bg-[#E6F9F0] text-[#00B578]' : 'bg-[#FFF0F0] text-[#FF4D4F]'
              }`}
            >
              {profitSign}{profitRate.toFixed(2)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function buildRows(data: AssetOverview | null, coins: CoinInfo[], preferred: string[], hideSmall: boolean): AccountVO[] {
  const byCoin = new Map((data?.coinSummary ?? []).map((row) => [row.coin, row]));
  const coinSet = new Set([...preferred, ...coins.map((coin) => coin.code)]);
  return Array.from(coinSet)
    .map((coin) => {
      const existing = byCoin.get(coin);
      return (
        existing ?? {
          accountType: 0,
          coin,
          available: '0',
          frozen: '0',
          valuation: '0',
          price: '0',
        }
      );
    })
    .filter((row) => !hideSmall || Number(row.valuation ?? 0) > 1)
    .sort((a, b) => {
      const valA = Number(a.valuation ?? 0);
      const valB = Number(b.valuation ?? 0);
      if (valA > 0 && valB === 0) return -1;
      if (valA === 0 && valB > 0) return 1;
      if (valA > 0 && valB > 0) return valB - valA;
      return 0;
    });
}

function coinFullName(coin: string) {
  const map: Record<string, string> = {
    USDT: 'Tether USD',
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    TRX: 'TRON',
    BCH: 'Bitcoin Cash',
    XRP: 'Ripple',
    LTC: 'Litecoin',
    SOL: 'Solana',
    DOGE: 'Dogecoin',
    LINK: 'Chainlink',
    UNI: 'Uniswap',
    FIL: 'Filecoin',
    XTZ: 'Tezos',
    APE: 'ApeCoin',
    MANA: 'Decentraland',
    USDC: 'USD Coin',
    DAI: 'Dai',
    BNB: 'BNB',
    ADA: 'Cardano',
    DOT: 'Polkadot',
    AVAX: 'Avalanche',
    MATIC: 'Polygon',
  };
  return map[coin] ?? coin;
}

function formatCoinAmount(value: string, _coin: string) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}
