import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpFromLine,
  Award,
  Bell,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  User,
  Wallet,
  Zap,
} from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { AsterSearchBar, BottomSheet, CoinIcon, CoinLogo, PairCoinIcon } from '@/components/AsterUI';
import { SymbolBadges } from '@/components/SymbolBadges';
import { fetchAnnouncementPage, type AnnouncementItem } from '@/api/announcement';
import { fetchRank, type RankPair, type SymbolRow } from '@/api/quote';
import { readCachedQuoteTicks, subscribeQuote, type WsTick } from '@/api/quoteWS';
import { fetchAiStrategies, fetchPortfolioProducts, type AiStrategy, type PortfolioProduct } from '@/api/finance';
import { fetchFollowTraders, type FollowTrader } from '@/api/follow';
import { fetchOverviewCached, getOverviewCacheSnapshot, type AssetOverview } from '@/api/asset';
import { AiSubscribeSheet, PcStrategyCard, percentText, StrategyIcon } from './finance/aiShared';
import { getPortfolioDisplayName } from './finance/portfolioShared';
import { TraderAvatar } from './Follow';
import { useUserStore } from '@/store/userStore';
import { formatChangePercent, parseFiniteNumber } from '@/utils/number';
import { buildKlinePath, buildTradePagePath, isViewOnlySpot } from '@/utils/market';
import { toast } from '@/components/Toast';
import { useFavoriteSymbols } from '@/hooks/useFavoriteSymbols';
import { useMarketStore } from '@/store/marketStore';
import { useCoinLogoMap } from '@/hooks/useCoinLogoMap';
import { useSupportEntryNavigation } from '@/hooks/useSupportEntryNavigation';
import { useWalletModal } from '@/hooks/useWalletModal';
import { brandLockupDarkUrl, brandName, brandNameUpper } from '@/brand';
import { maskSensitiveText } from '@/utils/secureStorage';

const MARKET_CATS = ['catCrypto', 'catForex', 'catMetal', 'catCommodity', 'catIndex', 'catStock'] as const;
const HOME_CATS = ['favorite', ...MARKET_CATS] as const;
type MarketCatKey = (typeof MARKET_CATS)[number];
const MARKET_CATEGORY_MAP: Record<MarketCatKey, string> = {
  catCrypto: 'crypto',
  catForex: 'forex',
  catMetal: 'metal',
  catCommodity: 'commodity',
  catIndex: 'index',
  catStock: 'stock',
};
const SHEET_TABS = [
  { key: 'favorite', labelKey: 'market.cFavorite' },
  { key: 'spot', labelKey: 'market.cSpot' },
  { key: 'perp', labelKey: 'market.cPerp' },
  { key: 'option', labelKey: 'market.cOption' },
] as const;
const ASTER_LOGO = brandLockupDarkUrl;
const ASTER_KEFU = '/assets/aster-kefu.png';
const ASTER_NFT = '/assets/aster-nft.png';
const ASTER_PERSON_LINE = '/assets/aster-person-line.png';
const ASTER_PLUS = '/assets/aster-plus.svg';
const ASTER_MINUS = '/assets/aster-minus.svg';
const TARGET_HOME_BG = '/assets/product-hero-crypto.jpg';
const TARGET_NFT_PC = '/assets/product-nft-cube.png';
const TARGET_PERSON_PC = '/assets/product-trader-journey.png';
const TARGET_KEFU = '/assets/aster-kefu.png';
const SUPPORT_BUTTON_SIZE = 46;
const SUPPORT_BUTTON_EDGE_GAP = 16;
const SUPPORT_BUTTON_DEFAULT_RIGHT_GAP = 6;
const SUPPORT_BUTTON_DEFAULT_VERTICAL_RATIO = 0.65;
const SUPPORT_BUTTON_DRAG_THRESHOLD = 6;

const footerGroups = [
  { titleKey: 'home.footerMarket', links: [{ labelKey: 'trade.spot', to: '/market' }, { labelKey: 'nav.perp', to: '/perp' }, { labelKey: 'nav.option', to: '/option' }] },
  { titleKey: 'home.footerAssets', links: [{ labelKey: 'home.myAssets', to: '/assets' }, { labelKey: 'asset.deposit', to: '/assets/deposit' }, { labelKey: 'asset.withdraw', to: '/assets/withdraw' }, { labelKey: 'asset.transfer', to: '/assets/transfer' }, { labelKey: 'home.orderCenter', to: '/finance/orders' }] },
  { titleKey: 'home.footerFinance', links: [{ labelKey: 'home.products', to: '/finance' }] },
  { titleKey: 'home.footerSupport', links: [{ labelKey: 'support.tutorial', to: '/support' }, { labelKey: 'home.consulting', to: '/support-entry' }] },
  { titleKey: 'home.footerPolicy', links: [{ labelKey: 'home.terms', to: '/legal/terms' }, { labelKey: 'home.privacy', to: '/legal/privacy' }, { labelKey: 'home.aml', to: '/legal/aml' }] },
];

const COIN_NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  ATOM: 'ATOM',
  SOL: 'Solana',
  BCH: 'Bitcoin Cash',
  XRP: 'Ripple',
  LTC: 'LTC',
  USDC: 'USDCoin',
  DOGE: 'Dogecoin',
  FIL: 'Filecoin',
  TRX: 'TRON',
};

type FloatingButtonPosition = {
  x: number;
  y: number;
};

type SupportButtonDragState = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
  moved: boolean;
};

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getSupportButtonVisibleBounds() {
  if (typeof window === 'undefined') {
    return {
      minX: SUPPORT_BUTTON_EDGE_GAP,
      maxX: SUPPORT_BUTTON_EDGE_GAP,
      minY: SUPPORT_BUTTON_EDGE_GAP,
      maxY: SUPPORT_BUTTON_EDGE_GAP,
    };
  }
  return {
    minX: SUPPORT_BUTTON_EDGE_GAP,
    maxX: Math.max(SUPPORT_BUTTON_EDGE_GAP, window.innerWidth - SUPPORT_BUTTON_SIZE - SUPPORT_BUTTON_EDGE_GAP),
    minY: SUPPORT_BUTTON_EDGE_GAP,
    maxY: Math.max(SUPPORT_BUTTON_EDGE_GAP, window.innerHeight - SUPPORT_BUTTON_SIZE - SUPPORT_BUTTON_EDGE_GAP),
  };
}

function clampSupportButtonToVisibleArea(position: FloatingButtonPosition): FloatingButtonPosition {
  if (typeof window === 'undefined') {
    return position;
  }
  const { minX, maxX, minY, maxY } = getSupportButtonVisibleBounds();
  return {
    x: clampValue(position.x, minX, maxX),
    y: clampValue(position.y, minY, maxY),
  };
}

function isSupportButtonOffScreen(position: FloatingButtonPosition): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const { innerWidth, innerHeight } = window;
  return (
    position.x + SUPPORT_BUTTON_SIZE <= 0
    || position.x >= innerWidth
    || position.y + SUPPORT_BUTTON_SIZE <= 0
    || position.y >= innerHeight
  );
}

function snapSupportButtonPosition(position: FloatingButtonPosition): FloatingButtonPosition {
  const clamped = clampSupportButtonToVisibleArea(position);
  if (typeof window === 'undefined') {
    return clamped;
  }
  const leftX = SUPPORT_BUTTON_EDGE_GAP;
  const rightX = window.innerWidth - SUPPORT_BUTTON_SIZE - SUPPORT_BUTTON_EDGE_GAP;
  const midpoint = clamped.x + SUPPORT_BUTTON_SIZE / 2;
  return {
    x: midpoint >= window.innerWidth / 2 ? rightX : leftX,
    y: clamped.y,
  };
}

function getDefaultSupportButtonPosition(): FloatingButtonPosition {
  if (typeof window === 'undefined') {
    return { x: SUPPORT_BUTTON_EDGE_GAP, y: SUPPORT_BUTTON_EDGE_GAP };
  }
  const { minY, maxY } = getSupportButtonVisibleBounds();
  const targetY = window.innerHeight * SUPPORT_BUTTON_DEFAULT_VERTICAL_RATIO - SUPPORT_BUTTON_SIZE / 2;
  return {
    x: window.innerWidth - SUPPORT_BUTTON_SIZE - SUPPORT_BUTTON_DEFAULT_RIGHT_GAP,
    y: clampValue(targetY, minY, maxY),
  };
}

function createEmptyHomeRows(): Record<MarketCatKey, SymbolRow[]> {
  return {
    catCrypto: [],
    catForex: [],
    catMetal: [],
    catCommodity: [],
    catIndex: [],
    catStock: [],
  };
}

function formatPrice(p: string | null | undefined, precision = 4): string {
  if (!p) return '--';
  const n = Number(p);
  if (!isFinite(n)) return '--';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: Math.min(precision, 8),
    maximumFractionDigits: Math.min(precision, 8),
  });
}

function formatNoticeTime(value?: string) {
  if (!value) return '';
  return value.replace(/-/g, '/').slice(0, 19);
}

function MenuGridIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      {[4, 12, 20].map((x) =>
        [4, 12, 20].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" rx="0.6" fill="currentColor" />)
      )}
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M4.5 14h19M14 4c3 3.2 4.5 6.5 4.5 10S17 20.8 14 24M14 4c-3 3.2-4.5 6.5-4.5 10S11 20.8 14 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { isMobile } = useResponsive();
  const nav = useNavigate();
  const token = useUserStore((s) => s.token);
  const user = useUserStore((s) => s.user);
  const refresh = useUserStore((s) => s.refresh);

  const readSymbols = useMarketStore((state) => state.readSymbols);
  const [homeRowsByCategory, setHomeRowsByCategory] = useState<Record<MarketCatKey, SymbolRow[]>>(() => {
    const next = createEmptyHomeRows();
    MARKET_CATS.forEach((cat) => {
      next[cat] = readSymbols('spot', MARKET_CATEGORY_MAP[cat], 'all', 'light');
    });
    return next;
  });
  const [sheetTradeRows, setSheetTradeRows] = useState<SymbolRow[]>([]);
  const [rank, setRank] = useState<RankPair | null>(null);
  const [ticks, setTicks] = useState<Record<string, WsTick>>(() => readCachedQuoteTicks());
  const [notices, setNotices] = useState<AnnouncementItem[]>([]);
  const [activeCat, setActiveCat] = useState<(typeof HOME_CATS)[number]>('catCrypto');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<(typeof SHEET_TABS)[number]['key']>('spot');
  const [sheetCategory, setSheetCategory] = useState<MarketCatKey>('catCrypto');
  const [keyword, setKeyword] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
  const [strategies, setStrategies] = useState<AiStrategy[]>([]);
  const [portfolios, setPortfolios] = useState<PortfolioProduct[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<AiStrategy | null>(null);
  const [supportButtonPos, setSupportButtonPos] = useState<FloatingButtonPosition | null>(null);
  const [supportDragging, setSupportDragging] = useState(false);
  const { favorites: favs, toggleFavorite, isFavorite } = useFavoriteSymbols();
  const getSymbols = useMarketStore((state) => state.getSymbols);
  const supportDragRef = useRef<SupportButtonDragState | null>(null);
  const suppressSupportClickRef = useRef(false);
  const openSupportEntry = useSupportEntryNavigation();
  const { openWalletModal } = useWalletModal();
  const { logoMap: coinLogoMap, loading: coinLogoLoading } = useCoinLogoMap();
  const [assetOverview, setAssetOverview] = useState<AssetOverview | null>(() => getOverviewCacheSnapshot());
  const [hideBalance, setHideBalance] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('aster_hide_balance');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true; // 首次进入默认隐藏金额
  });

  const toggleHideBalance = () => {
    setHideBalance((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('aster_hide_balance', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchOverviewCached()
      .then((res) => {
        if (!cancelled && res) setAssetOverview(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

  const sheetTradeType = useMemo(() => {
    if (sheetTab === 'perp') return 'perp';
    if (sheetTab === 'option') return 'option';
    return 'spot';
  }, [sheetTab]);

  useEffect(() => {
    if (token && !user) refresh();
  }, [token, user, refresh]);

  useEffect(() => {
    let cancel = false;
    Promise.allSettled(MARKET_CATS.map((cat) => getSymbols('spot', MARKET_CATEGORY_MAP[cat], 'all', 180_000, 'light'))).then((results) => {
      if (cancel) return;
      const next = createEmptyHomeRows();
      MARKET_CATS.forEach((cat, index) => {
        next[cat] = results[index].status === 'fulfilled' ? (results[index].value ?? []) : [];
      });
      setHomeRowsByCategory(next);
    });
    fetchRank('spot', 5)
      .then((data) => !cancel && setRank(data ?? null))
      .catch(() => !cancel && setRank(null));
    return () => {
      cancel = true;
    };
  }, [getSymbols]);

  useEffect(() => {
    let cancel = false;
    fetchAnnouncementPage(1, 3, i18n.language)
      .then((data) => !cancel && setNotices(data?.records ?? []))
      .catch(() => !cancel && setNotices([]));
    return () => {
      cancel = true;
    };
  }, [i18n.language]);

  useEffect(() => {
    let cancel = false;
    Promise.allSettled([fetchAiStrategies(), fetchPortfolioProducts()]).then(([strategyRes, portfolioRes]) => {
      if (cancel) return;
      if (strategyRes.status === 'fulfilled') setStrategies(strategyRes.value ?? []);
      if (portfolioRes.status === 'fulfilled') setPortfolios(portfolioRes.value ?? []);
    });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setSupportButtonPos(null);
      setSupportDragging(false);
      supportDragRef.current = null;
      suppressSupportClickRef.current = false;
      return;
    }
    setSupportButtonPos(getDefaultSupportButtonPosition());
    const handleResize = () => {
      setSupportButtonPos((prev) => {
        if (!prev) {
          return null;
        }
        if (isSupportButtonOffScreen(prev)) {
          return null;
        }
        return snapSupportButtonPosition(prev);
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  const allHomeRows = useMemo(() => MARKET_CATS.flatMap((cat) => homeRowsByCategory[cat]), [homeRowsByCategory]);

  const homeRows = useMemo(() => {
    const source = activeCat === 'favorite'
      ? allHomeRows.filter((r) => favs.has(r.alltickCode))
      : (homeRowsByCategory[activeCat] ?? []);

    return [...source].sort((a, b) => {
      const priceA = parseFiniteNumber(ticks[a.alltickCode]?.price ?? a.price) ?? 0;
      const priceB = parseFiniteNumber(ticks[b.alltickCode]?.price ?? b.price) ?? 0;
      if (priceB !== priceA) {
        return priceB - priceA;
      }
      return a.symbol.localeCompare(b.symbol);
    });
  }, [activeCat, allHomeRows, favs, homeRowsByCategory, ticks]);
  const displayedHomeRows = useMemo(() => homeRows.slice(0, 8), [homeRows]);

  const subscribeCodesKey = useMemo(() => {
    const codes = displayedHomeRows
      .filter((r) => r.subscribeEnabled === 1)
      .map((r) => r.alltickCode)
      .filter(Boolean);
    const sheetCodes = sheetTradeRows
      .filter((r) => r.subscribeEnabled === 1)
      .map((r) => r.alltickCode)
      .filter(Boolean);
    return Array.from(new Set([...codes, ...sheetCodes])).sort().join(',');
  }, [displayedHomeRows, sheetTradeRows]);

  useEffect(() => {
    if (!subscribeCodesKey) return;
    const allCodes = subscribeCodesKey.split(',');
    return subscribeQuote(allCodes, (tick) => {
      setTicks((prev) => ({ ...prev, [tick.symbol]: tick }));
    });
  }, [subscribeCodesKey]);

  useEffect(() => {
    if (!sheetOpen) return;
    let cancel = false;
    getSymbols(sheetTradeType, MARKET_CATEGORY_MAP[sheetCategory], sheetTradeType === 'spot' ? 'all' : 'active', 180_000, 'light')
      .then((data) => !cancel && setSheetTradeRows(data ?? []))
      .catch(() => !cancel && setSheetTradeRows([]));
    return () => {
      cancel = true;
    };
  }, [getSymbols, sheetCategory, sheetOpen, sheetTradeType]);

  const sheetRows = useMemo(() => {
    const spotRows = homeRowsByCategory[sheetCategory];
    const source = sheetTab === 'favorite' ? spotRows.filter((r) => isFavorite(r.alltickCode)) : sheetTradeRows;
    if (!keyword.trim()) return source;
    const k = keyword.trim().toUpperCase();
    return source.filter((r) => r.symbol.includes(k) || r.baseCoin.includes(k));
  }, [homeRowsByCategory, isFavorite, keyword, sheetCategory, sheetTab, sheetTradeRows]);

  const noticeRows = notices.slice(0, 3);
  const strategyRows = strategies.slice(0, 4);
  const portfolioRows = portfolios.slice(0, 5);

  const requireLogin = (path: string) => {
    if (token) { nav(path); } else { nav(`/auth/login?redirect=${encodeURIComponent(path)}`); }
  };

  const openSymbolTarget = (row: SymbolRow, targetType = sheetTradeType) => {
    const fallbackCategory = MARKET_CATEGORY_MAP[sheetCategory];
    if (targetType === 'spot' && isViewOnlySpot(row)) {
      toast.info(t('market.limitedViewOnly', '当前外汇/受限现货仅支持查看行情，暂不支持完整下单交易'));
      nav(buildKlinePath(row, fallbackCategory, row.tradeType, 'all'));
      return;
    }
    nav(buildTradePagePath(targetType, row, fallbackCategory));
  };

  const toggleFav = (code: string) => {
    const favorited = toggleFavorite(code);
    toast.success(favorited ? t('market.favoriteAdded', '已加入收藏') : t('market.favoriteRemoved', '已取消收藏'));
  };

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const handleSupportPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    supportDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    suppressSupportClickRef.current = false;
    setSupportDragging(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSupportPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = supportDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.moved && distance >= SUPPORT_BUTTON_DRAG_THRESHOLD) {
      drag.moved = true;
      setSupportDragging(true);
    }
    if (!drag.moved) {
      return;
    }
    setSupportButtonPos({
      x: event.clientX - drag.offsetX,
      y: event.clientY - drag.offsetY,
    });
  };

  const finishSupportDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = supportDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    suppressSupportClickRef.current = drag.moved;
    supportDragRef.current = null;
    setSupportDragging(false);
    if (drag.moved) {
      setSupportButtonPos((prev) => {
        if (!prev || isSupportButtonOffScreen(prev)) {
          return null;
        }
        return snapSupportButtonPosition(prev);
      });
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const openSupportPage = () => {
    if (suppressSupportClickRef.current) {
      suppressSupportClickRef.current = false;
      return;
    }
    void openSupportEntry();
  };

  const totalBalanceNum = Number(assetOverview?.totalUsd || 0);
  const totalBalanceFormatted = isFinite(totalBalanceNum)
    ? totalBalanceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';
  const cnyValuation = isFinite(totalBalanceNum)
    ? (totalBalanceNum * 7.25).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';
  const todayProfitNum = Number(assetOverview?.todayProfit || 0);
  const todayProfitDisplay = isFinite(todayProfitNum)
    ? `${todayProfitNum >= 0 ? '+' : ''}${todayProfitNum.toFixed(2)} USDT`
    : '+0.00 USDT';

  if (isMobile) {
    return (
      <>
        <div className="aster-page">
          {/* 顶部导航栏 */}
          <div className="fade-in-top flex h-12 items-center justify-between">
            <Link to={token ? "/profile" : "/auth/login"} className="flex items-center gap-2.5 hover:opacity-85 transition">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 shadow-sm">
                <User size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-textSub leading-none">
                  {token ? t('home.greeting', '欢迎回来') : t('common.welcome', '欢迎体验')}
                </div>
                <div className="mt-1 text-[14px] font-bold text-text truncate max-w-[130px] leading-none">
                  {token ? (user?.nickname || maskSensitiveText(user?.phone) || maskSensitiveText(user?.email) || 'Trader') : brandName}
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-1.5">
              {!token && (
                <div className="mr-1 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => nav('/auth/login')}
                    className="h-7.5 rounded-full bg-primary/10 px-2.5 text-xs font-semibold text-primary hover:bg-primary/20 transition"
                  >
                    {t('auth.login', '登录')}
                  </button>
                  <button
                    type="button"
                    onClick={() => nav('/auth/register')}
                    className="h-7.5 rounded-full bg-gradient-to-r from-[#00C4DF] to-[#0284C7] px-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition"
                  >
                    {t('auth.register', '注册')}
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => nav('/announcement')}
                aria-label="announcement"
                className="flex h-9 w-9 items-center justify-center rounded-full text-textSub hover:bg-bgSoft hover:text-text transition relative"
              >
                <Bell size={18} />
                {notices.length > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
                )}
              </button>
              <button
                type="button"
                onClick={() => nav('/profile/language')}
                aria-label="language"
                className="flex h-9 w-9 items-center justify-center rounded-full text-textSub hover:bg-bgSoft hover:text-text transition"
              >
                <GlobeIcon />
              </button>
            </div>
          </div>

          {/* 资产总览卡片 (硅谷冰川天青极简风) */}
          <div className="fade-in-bottom mt-3 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00C4DF] via-[#0284C7] to-[#0369A1] p-5 text-white shadow-[0_10px_28px_rgba(0,196,223,0.28)]">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-sky-300/20 blur-xl" />

            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white/80">{t('asset.totalEst', '总资产折合 (USDT)')}</span>
                  <button
                    type="button"
                    onClick={toggleHideBalance}
                    className="text-white/70 hover:text-white transition p-0.5"
                    aria-label={hideBalance ? 'show balance' : 'hide balance'}
                  >
                    {hideBalance ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  <TrendingUp size={12} />
                  <span>{todayProfitDisplay}</span>
                </div>
              </div>

              <div className="mt-2.5">
                <div className="text-[32px] font-bold tracking-tight num leading-none">
                  {hideBalance ? '••••••••' : totalBalanceFormatted}
                  <span className="ml-1.5 text-sm font-semibold text-white/80">USDT</span>
                </div>
                <div className="mt-1.5 text-xs text-white/75 num font-medium">
                  ≈ {hideBalance ? '••••' : `¥ ${cnyValuation}`}
                </div>
              </div>

              {/* 4 个快捷操作入口 */}
              <div className="mt-5 grid grid-cols-4 gap-2 pt-4 border-t border-white/20">
                <button
                  type="button"
                  onClick={() => requireLogin('/assets/deposit')}
                  className="flex flex-col items-center gap-1.5 text-white/95 hover:text-white transition group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md shadow-sm group-hover:bg-white/30 group-active:scale-95 transition">
                    <ArrowDownToLine size={19} className="text-white" />
                  </div>
                  <span className="text-[12px] font-medium">{t('nav.deposit', '充币')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => requireLogin('/assets/withdraw')}
                  className="flex flex-col items-center gap-1.5 text-white/95 hover:text-white transition group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md shadow-sm group-hover:bg-white/30 group-active:scale-95 transition">
                    <ArrowUpFromLine size={19} className="text-white" />
                  </div>
                  <span className="text-[12px] font-medium">{t('nav.withdraw', '提币')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => requireLogin('/assets/flash')}
                  className="flex flex-col items-center gap-1.5 text-white/95 hover:text-white transition group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md shadow-sm group-hover:bg-white/30 group-active:scale-95 transition">
                    <ArrowLeftRight size={19} className="text-white" />
                  </div>
                  <span className="text-[12px] font-medium">{t('flash.title', '闪兑')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => nav('/market')}
                  className="flex flex-col items-center gap-1.5 text-white/95 hover:text-white transition group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md shadow-sm group-hover:bg-white/30 group-active:scale-95 transition">
                    <TrendingUp size={19} className="text-white" />
                  </div>
                  <span className="text-[12px] font-medium">{t('nav.trade', '交易')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 业务快捷矩阵 */}
          <div className="fade-in-bottom-small mt-3.5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => nav('/option')}
              className="relative flex items-center gap-2.5 rounded-2xl border border-[#E8EEF3] bg-white p-3 shadow-card text-left hover:border-primary/40 transition active:scale-[0.98] overflow-hidden"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Zap size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate pr-6 text-[13px] font-bold leading-snug text-text">{t('nav.option', '期权秒合约')}</div>
                <div className="truncate text-[11px] font-medium leading-snug text-textSub">{t('option.instantTrade', '急速交割')}</div>
              </div>
              <span className="absolute right-2 top-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                60s
              </span>
            </button>

            <button
              type="button"
              onClick={() => nav('/perp')}
              className="relative flex items-center gap-2.5 rounded-2xl border border-[#E8EEF3] bg-white p-3 shadow-card text-left hover:border-primary/40 transition active:scale-[0.98] overflow-hidden"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                <Activity size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate pr-6 text-[13px] font-bold leading-snug text-text">{t('nav.perp', '永续合约')}</div>
                <div className="truncate text-[11px] font-medium leading-snug text-textSub">100X {t('perp.leverage', '杠杆')}</div>
              </div>
              <span className="absolute right-2 top-2 rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-bold text-sky-600">
                HOT
              </span>
            </button>

            <button
              type="button"
              onClick={() => nav('/finance')}
              className="relative flex items-center gap-2.5 rounded-2xl border border-[#E8EEF3] bg-white p-3 shadow-card text-left hover:border-primary/40 transition active:scale-[0.98] overflow-hidden"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Sparkles size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate pr-6 text-[13px] font-bold leading-snug text-text">{t('nav.finance', '理财中心')}</div>
                <div className="truncate text-[11px] font-medium leading-snug text-textSub">{t('discover.stableYield', '稳健生息')}</div>
              </div>
              <span className="absolute right-2 top-2 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">
                APR+
              </span>
            </button>

            <button
              type="button"
              onClick={() => nav('/follow')}
              className="relative flex items-center gap-2.5 rounded-2xl border border-[#E8EEF3] bg-white p-3 shadow-card text-left hover:border-primary/40 transition active:scale-[0.98] overflow-hidden"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                <Award size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate pr-6 text-[13px] font-bold leading-snug text-text">{t('home.follow', '跟单交易')}</div>
                <div className="truncate text-[11px] font-medium leading-snug text-textSub">{t('home.strategist', '顶尖交易员')}</div>
              </div>
              <span className="absolute right-2 top-2 rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600">
                TOP
              </span>
            </button>
          </div>

          {/* 公告栏 */}
          {notices.length > 0 && (
            <div className="fade-in-bottom-small mt-3 flex items-center justify-between rounded-xl border border-[#E8EEF3] bg-white px-3.5 py-2.5 shadow-card">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bell size={13} />
                </span>
                <Link
                  to={`/announcement/${notices[0].id}`}
                  className="truncate text-xs font-medium text-text hover:text-primary transition"
                >
                  {notices[0].title}
                </Link>
              </div>
              <Link
                to="/announcement"
                className="ml-2 flex shrink-0 items-center text-xs font-medium text-textSub hover:text-primary transition"
              >
                {t('common.more', '更多')} <ChevronRight size={14} />
              </Link>
            </div>
          )}

          {/* 搜索栏 */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="fade-in-bottom mt-3.5 flex h-11 w-full items-center gap-2.5 rounded-xl border border-[#E8EEF3] bg-white px-4 text-left shadow-card hover:border-primary/40 transition"
          >
            <Search size={16} className="text-primary" />
            <span className="text-xs text-textSub">{t('discover.searchPair', '搜索币种 / 合约 / 代码...')}</span>
          </button>

          {/* 市场分类标签 */}
          <div className="fade-in-bottom mt-4 flex gap-2 overflow-x-auto pb-1.5 text-xs font-medium scrollbar-none">
            {HOME_CATS.map((cat) => {
              const isActive = activeCat === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCat(cat)}
                  className={`shrink-0 rounded-full px-4 py-1.5 transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#00C4DF] to-[#0284C7] font-semibold text-white shadow-[0_2px_8px_rgba(0,196,223,0.3)]'
                      : 'border border-[#E5E9EE] bg-white text-textSub hover:text-text hover:border-textSub/30 active:bg-bgSoft'
                  }`}
                >
                  {cat === 'favorite' ? t('home.favorite') : t(`market.${cat}`)}
                </button>
              );
            })}
          </div>

          {/* 行情卡片列表 */}
          <section className="fade-in-bottom-small mt-3 rounded-2xl border border-[#EDF2F7] bg-white p-3.5 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
            <div className="grid grid-cols-12 px-2 pb-2.5 text-[11px] font-semibold text-textSub/75 border-b border-[#F1F5F9]">
              <div className="col-span-5">{t('market.symbol', '交易对')}</div>
              <div className="col-span-4 text-right pr-2">{t('market.lastPrice', '最新价')}</div>
              <div className="col-span-3 text-right">{t('market.change24h', '24H涨跌')}</div>
            </div>

            {displayedHomeRows.length === 0 ? (
              <div className="py-12 text-center text-xs text-textSub">
                {activeCat === 'favorite' ? t('home.noFavorite') : t('common.noData')}
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {displayedHomeRows.map((row) => (
                  <HomeQuoteRow
                    key={row.alltickCode}
                    row={row}
                    tick={ticks[row.alltickCode]}
                    onClick={() => openSymbolTarget(row)}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => nav('/market')}
              className="mt-3.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/[0.04] text-xs font-semibold text-primary hover:bg-primary/[0.08] active:scale-[0.99] transition"
            >
              {t('common.viewMore', '查看全部行情')} <ChevronRight size={14} />
            </button>
          </section>

          {/* 底部折叠信息与版权 */}
          <section className="mt-8 border-t border-line/60 pt-6">
            <div className="flex items-center">
              <img src={ASTER_LOGO} alt={brandName} className="h-8 w-auto max-w-[200px] object-contain" />
            </div>
            <p className="mt-3 text-xs text-textSub">{t('home.copyright')}</p>
            <div className="mt-4">
              {footerGroups.map((group) => {
                const open = openGroups.has(group.titleKey);
                return (
                  <div key={group.titleKey} className="border-b border-line/60 py-3.5">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.titleKey)}
                      className="flex w-full items-center justify-between text-left text-sm font-semibold text-text"
                    >
                      {t(group.titleKey)}
                      <img src={open ? ASTER_MINUS : ASTER_PLUS} alt="" className="h-3.5 w-3.5 opacity-60" />
                    </button>
                    {open && (
                      <div className="mt-3 space-y-2.5">
                        {group.links.map((link) => (
                          link.to === '/support-entry' ? (
                            <button
                              key={link.labelKey}
                              type="button"
                              onClick={() => void openSupportEntry()}
                              className="block text-xs font-normal text-textSub hover:text-primary transition"
                            >
                              {t(link.labelKey)}
                            </button>
                          ) : (
                            <Link key={link.labelKey} to={link.to} className="block text-xs font-normal text-textSub hover:text-primary transition">
                              {t(link.labelKey)}
                            </Link>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

        {supportButtonPos && (
          <button
            type="button"
            aria-label="support"
            onClick={openSupportPage}
            onPointerDown={handleSupportPointerDown}
            onPointerMove={handleSupportPointerMove}
            onPointerUp={finishSupportDrag}
            onPointerCancel={finishSupportDrag}
            className={`fade-in-right fixed z-30 flex h-[46px] w-[46px] items-center justify-center rounded-full touch-none select-none ${
              supportDragging ? 'scale-105 shadow-[0_14px_30px_rgba(0,0,0,0.22)]' : 'shadow-[0_10px_24px_rgba(0,0,0,0.18)]'
            }`}
            style={{
              left: supportButtonPos.x,
              top: supportButtonPos.y,
              transition: supportDragging ? 'none' : 'left 220ms ease, top 220ms ease, transform 160ms ease, box-shadow 160ms ease',
            }}
          >
            <img src={ASTER_KEFU} alt="" draggable={false} className="h-[46px] w-[46px] rounded-full object-contain" />
          </button>
        )}

        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} className="overflow-hidden">
          <div className="px-5 pb-5 pt-4">
            <AsterSearchBar value={keyword} onChange={setKeyword} placeholder={t('discover.searchPair')} />
            <div className="mt-5 flex gap-5 border-b border-line text-lg font-bold">
              {SHEET_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSheetTab(tab.key)}
                  className={`pb-3 ${sheetTab === tab.key ? 'border-b-2 border-text text-text' : 'text-textSub'}`}
                >
                  {t(tab.labelKey)}
                </button>
              ))}
            </div>
            <div className="mt-5 flex gap-3 overflow-x-auto text-[13px] font-semibold text-textSub scrollbar-none">
              {MARKET_CATS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSheetCategory(cat)}
                  className={`shrink-0 rounded-full px-3 py-1.5 leading-none ${cat === sheetCategory ? 'bg-bgSoft text-text' : ''}`}
                >
                  {t(`market.${cat}`)}
                </button>
              ))}
            </div>
            <div className="mt-3 max-h-[54vh] overflow-y-auto pr-1">
              {sheetRows.length === 0 ? (
                <div className="py-12 text-center text-sm text-textSub">{t('common.noData')}</div>
              ) : (
                <ul>
                  {sheetRows.map((row) => (
                    <li key={`${sheetTab}-${row.alltickCode}`} className="flex items-center gap-3 py-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleFav(row.alltickCode);
                        }}
                        aria-label="favorite"
                        className="text-textMute"
                      >
                        <Star
                          size={15}
                          fill={isFavorite(row.alltickCode) ? '#1A1A1A' : 'none'}
                          stroke={isFavorite(row.alltickCode) ? '#1A1A1A' : 'currentColor'}
                        />
                      </button>
                      <PairCoinIcon
                        baseCoin={row.baseCoin}
                        quoteCoin={row.quoteCoin}
                        baseLogo={row.baseLogo}
                        quoteLogo={row.quoteLogo}
                        size="sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSheetOpen(false);
                          openSymbolTarget(row);
                        }}
                        className="flex flex-1 items-center justify-between text-left"
                      >
                        <span className="inline-flex max-w-full items-start gap-[3px] pr-2 leading-tight">
                          <span className="break-words text-[14px] font-semibold text-text">
                            {row.baseCoin}<span className="text-textSub">/{row.quoteCoin}</span>
                          </span>
                          <SymbolBadges row={row} className="mt-[1px]" />
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-[13px] font-semibold num">{formatPrice(ticks[row.alltickCode]?.price ?? row.price, row.pricePrecision)}</span>
                          <span className="block text-xs text-textSub num">
                            {formatChangePercent(ticks[row.alltickCode]?.change ?? row.change, row.changePrecision)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </BottomSheet>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="w-full pb-0 text-text">
        {/* Floating Customer Service Entry */}
        <div className="fixed bottom-[32px] right-0 z-50 flex min-h-[140px] w-[86px] flex-col items-center justify-center rounded-l-2xl border-y border-l border-line bg-card/95 py-3.5 shadow-xl backdrop-blur transition hover:bg-card">
          <button
            type="button"
            onClick={() => openSupportEntry()}
            className="flex w-full flex-col items-center justify-center gap-2 px-1 text-center group cursor-pointer"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-text/5 p-1 transition group-hover:scale-105">
              <img src={TARGET_KEFU} alt="" className="h-full w-full object-contain rounded-full" />
            </div>
            <span className="text-[11px] font-semibold leading-tight text-textSub group-hover:text-primary line-clamp-2 px-0.5">
              {t('home.onlineService')}
            </span>
          </button>
        </div>

        <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#f8fafc] via-[#ffffff] to-[#ffffff] py-16 lg:py-24">
          {/* Background crypto illustration */}
          <div className="pointer-events-none absolute inset-y-0 right-0 z-0 flex items-center justify-end overflow-hidden opacity-95 select-none [mask-image:linear-gradient(to_left,black_75%,transparent_100%)]">
            <img
              src={TARGET_HOME_BG}
              alt=""
              className="h-[460px] w-auto max-w-[48vw] object-contain translate-x-[2%] mix-blend-multiply drop-shadow-sm"
            />
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-[1300px] flex-col items-center px-4 text-center uppercase">
            <img src={ASTER_LOGO} alt={brandName} className="fade-in-top h-[72px] w-auto max-w-[360px] object-contain" />
            <h1 className="fade-in-top mt-4 text-[42px] lg:text-[46px] font-bold leading-[1.2]">{t('home.heroTitle')}</h1>
            <h2 className="fade-in-right mt-[10px] text-[38px] lg:text-[46px] font-bold leading-[1.2]">
              {t('home.heroStart')} <span className="tracking-[-2px] text-brandLight">{brandNameUpper}</span>
            </h2>
            <p className="fade-in-left mt-[20px] max-w-[800px] text-[18px] lg:text-[22px] font-medium leading-[1.4] text-textSubPc normal-case">{t('home.desc')}</p>
            {!token && (
              <div className="fade-in-bottom mt-8 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => nav('/auth/register')}
                  className="flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#00C4DF] to-[#0284C7] px-8 text-base font-bold text-white shadow-[0_4px_16px_rgba(0,196,223,0.35)] hover:opacity-95 transition"
                >
                  {t('auth.register', '注册')}
                </button>
                <button
                  type="button"
                  onClick={() => nav('/auth/login')}
                  className="flex h-11 items-center justify-center rounded-xl border border-line bg-card/90 px-8 text-base font-semibold text-text shadow-sm backdrop-blur hover:bg-card transition"
                >
                  {t('auth.login', '登录')}
                </button>
              </div>
            )}
          </div>
        </section>

      <section className="mx-auto w-full max-w-[1300px] px-4">
        <div className="mt-10 flex h-6 items-center justify-between text-[12px] leading-6">
          <div className="flex min-w-0 items-center font-semibold">
            <Bell size={20} className="mr-[10px] shrink-0 fill-text" />
            <span className="truncate text-[16px] font-medium text-text">{noticeRows[0]?.title ?? t('common.noData')}</span>
          </div>
          <Link to="/announcement" className="flex items-center gap-1 font-semibold">
            {t('common.viewMore')} <ChevronRight size={13} />
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-[50px] w-full max-w-[1300px] px-4 text-center">
        <h2 className="pc-h1 m-0">{t('home.proTitle')}</h2>
        <p className="mb-[40px] mt-[16px] text-[18px] lg:text-[20px] font-medium leading-[1.4] text-textSubPc">{t('home.proSub')}</p>
        
        {/* Professional Markets Card Container (CoinEx/Binance standard) */}
        <div className="rounded-2xl border border-line bg-card shadow-xs overflow-hidden text-left">
          {/* Top Category Tabs & View More Link */}
          <div className="flex items-center justify-between border-b border-line px-6 py-3.5 bg-bgSoft/30">
            <div className="flex flex-wrap items-center gap-2">
              {HOME_CATS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCat(cat)}
                  className={`h-9 rounded-xl px-4 text-[13px] font-bold transition-all active:scale-95 ${
                    activeCat === cat
                      ? 'bg-text text-white shadow-sm'
                      : 'text-textSubPc hover:bg-bgSoft hover:text-text'
                  }`}
                >
                  {cat === 'favorite' ? t('home.favorite') : t(`market.${cat}`)}
                </button>
              ))}
            </div>
            <Link
              to="/market"
              className="group hidden sm:flex items-center gap-1 text-xs font-bold text-primary hover:underline underline-offset-4"
            >
              <span>{t('market.viewAll', '查看全部行情')}</span>
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition" />
            </Link>
          </div>

          {/* Professional Table Header */}
          <div className="grid grid-cols-[minmax(240px,2fr)_minmax(140px,1.2fr)_minmax(120px,1fr)_minmax(130px,1fr)_minmax(120px,1fr)_minmax(90px,0.8fr)] items-center px-6 py-3 text-[12px] font-semibold text-textSubPc border-b border-line bg-bgSoft/20">
            <div>{t('market.colName', '币种 / 市场')}</div>
            <div>{t('market.colPrice', '最新价')}</div>
            <div className="text-right">{t('market.colChange', '24h 涨跌幅')}</div>
            <div className="text-right">{t('kline.volume24h', '24h 成交额')}</div>
            <div className="text-center">{t('market.trend', '24h 走势')}</div>
            <div className="text-right">{t('market.action', '操作')}</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-line/60">
            {displayedHomeRows.length ? (
              displayedHomeRows.map((row) => (
                <DesktopQuoteRow
                  key={row.alltickCode}
                  row={row}
                  tick={ticks[row.alltickCode]}
                  onClick={() => nav(buildTradePagePath('spot', row))}
                />
              ))
            ) : (
              <div className="py-16 text-center text-sm text-textSubPc">
                {activeCat === 'favorite' ? t('home.noFavorite') : t('common.noData')}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/market" className="pc-btn-pill inline-flex items-center gap-2">
            <span>{t('common.viewMore')}</span>
            <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-[70px] w-full max-w-[1300px] px-4">
        <div className="flex items-center justify-between">
          <h2 className="pc-h3 m-0">{t('home.announcement')}</h2>
          <Link to="/announcement" className="flex items-center gap-1 text-[12px] leading-none text-text">
            {t('common.viewMore')} <ChevronRight size={13} />
          </Link>
        </div>
        <div className="mt-[40px] flex items-center justify-center gap-5">
          {noticeRows.length === 0 ? (
            <div className="w-full py-10 text-center text-sm text-textSubPc">{t('common.noData')}</div>
          ) : noticeRows.map((item, index) => <NoticeCard key={item.id} item={item} index={index} />)}
        </div>
      </section>

      <DesktopFollowSection />

      <section className="mx-auto mt-[120px] w-full max-w-[1300px] px-4 text-center">
        <h2 className="pc-h1 m-0">{t('discover.aiStrategy')}</h2>
        <p className="mt-[18px] block text-[22px] font-medium leading-[30px] text-textMute">{t('home.aiSlogan')}</p>
        <div className="mt-[40px] grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 text-left">
          {strategyRows.length === 0 ? (
            <div className="col-span-full py-10 text-center text-sm text-textSubPc">{t('common.noData')}</div>
          ) : strategyRows.map((strategy) => (
            <PcStrategyCard
              key={strategy.id}
              strategy={strategy}
              logoMap={coinLogoMap}
              coinLogoLoading={coinLogoLoading}
              onOpen={() => setSelectedStrategy(strategy)}
              onUse={() => setSelectedStrategy(strategy)}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto mt-[120px] flex w-full max-w-[1300px] flex-col items-center px-4 text-center">
        <h2 className="pc-h1 m-0">{t('discover.portfolio')}</h2>
        <p className="mb-[40px] mt-[18px] text-[22px] font-medium leading-[30px] text-textMute">{t('discover.portfolioDesc')}</p>
        <div className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 justify-center gap-5 text-left">
          {portfolioRows.length === 0 ? (
            <div className="col-span-full py-10 text-center text-sm text-textSubPc">{t('common.noData')}</div>
          ) : portfolioRows.map((item) => (
            <DesktopPortfolioCard key={item.id} item={item} onClick={() => nav(`/finance/portfolio/${item.id}`)} />
          ))}
        </div>
        <Link to="/finance/portfolio" className="pc-btn-pill mx-auto mt-[40px]">
          {t('common.viewMore')}
        </Link>
      </section>

      <Link to="/nft" className="group mx-auto mt-[120px] block w-full max-w-[1300px] rounded-2xl bg-bgSection px-6 md:px-12 lg:px-20 pb-16 pt-[72px] transition hover:shadow-card">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex-1">
            <div className="text-[36px] lg:text-[42px] font-extrabold leading-[1.2] text-brandLight">{t('home.nftSlogan')}</div>
            <p className="mb-6 mt-4 text-[16px] lg:text-[18px] leading-[1.6] text-text">{t('home.nftDesc')}</p>
            <div className="inline-flex items-center gap-2 font-bold text-[16px] lg:text-[18px] text-brandLight group-hover:gap-3 transition-all">
              {t('home.goNftHall')} <ArrowRight size={18} />
            </div>
          </div>
          <div className="flex shrink-0 justify-center">
            <img src={TARGET_NFT_PC} alt="NFT" className="block w-64 lg:w-80 max-w-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105" />
          </div>
        </div>
        <div className="mt-20 text-center">
          <h2 className="pc-h2 m-0">{t('home.guideTitle')}</h2>
          <p className="mt-[18px] text-[16px] lg:text-[18px] leading-[1.6] text-textMute">{t('home.guideDesc')}</p>
          <div className="mx-auto mt-14 flex justify-center">
            <img src={TARGET_PERSON_PC} alt="" className="block w-full max-w-[860px] object-contain drop-shadow-sm" />
          </div>
          <div className="mx-auto mt-8 grid w-full max-w-[960px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {[
              {
                step: '01',
                title: t('home.guideStep1Title', 'Novice Trader'),
                desc: t('home.guideStep1Desc', 'Digital ID & secure wallet to get started safely'),
                accent: 'from-[#00C4DF] to-[#0284C7]',
                badgeBg: 'bg-[#00C4DF]/10 text-[#0096B4]',
              },
              {
                step: '02',
                title: t('home.guideStep2Title', 'Learn & Analyze'),
                desc: t('home.guideStep2Desc', 'AI analytics & candlestick charts for market insights'),
                accent: 'from-[#0284C7] to-[#2563EB]',
                badgeBg: 'bg-[#0284C7]/10 text-[#0284C7]',
              },
              {
                step: '03',
                title: t('home.guideStep3Title', 'Trade & Grow'),
                desc: t('home.guideStep3Desc', 'Portfolio growth and smart investment asset stacks'),
                accent: 'from-[#10B981] to-[#059669]',
                badgeBg: 'bg-[#10B981]/10 text-[#10B981]',
              },
              {
                step: '04',
                title: t('home.guideStep4Title', 'Pro Trader'),
                desc: t('home.guideStep4Desc', 'Diamond wealth badge with mastery and elite privileges'),
                accent: 'from-[#F59E0B] to-[#D97706]',
                badgeBg: 'bg-[#F59E0B]/10 text-[#D97706]',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group/card relative rounded-2xl border border-line/60 bg-white/70 p-4 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white hover:shadow-card"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className={`inline-flex h-6 px-2 items-center justify-center rounded-full text-[11px] font-black tracking-wider ${item.badgeBg}`}>
                    STEP {item.step}
                  </span>
                  <span className={`h-1.5 w-6 rounded-full bg-gradient-to-r ${item.accent} opacity-80`} />
                </div>
                <div className="text-[14px] font-bold text-text mb-1 group-hover/card:text-primary transition-colors">
                  {item.title}
                </div>
                <div className="text-[12px] leading-[1.5] text-textSub">
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Link>

      <AiSubscribeSheet strategy={selectedStrategy} open={Boolean(selectedStrategy)} onClose={() => setSelectedStrategy(null)} />
      </div>
    </>
  );
}

function formatVolume(v: string | number | undefined): string {
  if (!v) return '--';
  const n = Number(v);
  if (!isFinite(n) || n === 0) return '--';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function MiniSparkline({ change, seed }: { change: number | null; seed: string }) {
  const isUp = change !== null && change >= 0;
  const points = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffff;
    const pts: number[] = [];
    const base = isUp ? 26 : 10;
    const target = isUp ? 8 : 28;
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const noise = ((Math.sin(hash + i * 2.1) + 1) / 2) * 8 - 4;
      const val = base + (target - base) * progress + noise;
      pts.push(Math.max(4, Math.min(32, val)));
    }
    pts[0] = isUp ? 24 : 12;
    pts[steps] = isUp ? 8 : 28;
    return pts;
  }, [change, isUp, seed]);

  const pathD = useMemo(() => {
    const w = 90;
    const stepX = w / (points.length - 1);
    let d = `M 0,${points[0]}`;
    for (let i = 1; i < points.length; i++) {
      const prevX = (i - 1) * stepX;
      const prevY = points[i - 1];
      const curX = i * stepX;
      const curY = points[i];
      const midX = (prevX + curX) / 2;
      d += ` C ${midX},${prevY} ${midX},${curY} ${curX},${curY}`;
    }
    return d;
  }, [points]);

  const color = isUp ? '#00B578' : '#FF4D4F';
  const gradId = `spark-${seed.replace(/[^a-zA-Z0-9]/g, '')}-${isUp ? 'up' : 'down'}`;

  return (
    <svg width="90" height="34" viewBox="0 0 90 34" className="overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={`${pathD} L 90,34 L 0,34 Z`} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DesktopQuoteRow({ row, tick, onClick }: { row: SymbolRow; tick?: WsTick; onClick: () => void }) {
  const { t } = useTranslation();
  const price = tick?.price ?? row.price;
  const change = tick?.change ?? row.change;
  const changeNum = parseFiniteNumber(change);
  const up = changeNum !== null && changeNum >= 0;
  const volume = tick?.volume ?? row.volume;
  const pricePrecision = row.pricePrecision ?? 2;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      className="grid grid-cols-[minmax(240px,2fr)_minmax(140px,1.2fr)_minmax(120px,1fr)_minmax(130px,1fr)_minmax(120px,1fr)_minmax(90px,0.8fr)] items-center px-6 py-4 cursor-pointer text-left text-[14px] transition hover:bg-bgSoft/60 group"
    >
      {/* 1. 币种与全称 */}
      <div className="flex min-w-0 items-center gap-3 pr-2">
        <PairCoinIcon
          baseCoin={row.baseCoin}
          quoteCoin={row.quoteCoin}
          baseLogo={row.baseLogo}
          quoteLogo={row.quoteLogo}
          size="sm"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-bold text-[15px] text-text group-hover:text-primary transition">{row.baseCoin}</span>
            <span className="text-[12px] font-medium text-textSubPc">/{row.quoteCoin}</span>
            <SymbolBadges row={row} />
          </div>
          <div className="mt-1 truncate text-[12px] font-medium text-textSubPc">
            {COIN_NAMES[row.baseCoin] ?? row.baseCoin}
          </div>
        </div>
      </div>

      {/* 2. 最新价格 */}
      <div>
        <div className="num font-bold text-[16px] text-text group-hover:text-primary transition">
          ${formatPrice(price, pricePrecision)}
        </div>
        <div className="num mt-0.5 text-[11px] font-medium text-textSubPc">
          ≈ ¥{(Number(price || 0) * 7.25).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* 3. 24h 涨跌幅 */}
      <div className="text-right">
        <span
          className={`num inline-flex h-7 min-w-[76px] items-center justify-center rounded-lg px-2.5 text-[13px] font-bold ${
            changeNum === null
              ? 'bg-bgSoft text-textSubPc'
              : up
              ? 'bg-[#E6F9F0] text-[#00B578] dark:bg-[#00B578]/15'
              : 'bg-[#FFF0F0] text-[#FF4D4F] dark:bg-[#FF4D4F]/15'
          }`}
        >
          {formatChangePercent(changeNum, row.changePrecision)}
        </span>
      </div>

      {/* 4. 24h 成交额 */}
      <div className="num text-right font-semibold text-[14px] text-textSubPc">
        {formatVolume(volume)}
      </div>

      {/* 5. 24h 走势 Sparkline */}
      <div className="flex items-center justify-center px-2">
        <MiniSparkline change={changeNum} seed={row.alltickCode} />
      </div>

      {/* 6. 操作按钮 */}
      <div className="flex justify-end">
        <span
          className="inline-flex h-8 items-center justify-center rounded-xl bg-bgSoft px-3.5 text-xs font-bold text-text group-hover:bg-primary group-hover:text-white transition active:scale-95 shadow-2xs"
        >
          {t('common.trade', '交易')}
        </span>
      </div>
    </div>
  );
}

function NoticeCard({ item, index }: { item: AnnouncementItem; index: number }) {
  const title = item.title;
  const time = formatNoticeTime(item.publishedAt);
  const accent = ['#00C4DF', '#0284C7', '#10B981'][index % 3];
  const preview = item.content
    ?.replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();

  return (
    <Link to={`/announcement/${item.id}`} className="block flex-1 rounded-2xl border border-line bg-card p-5 transition hover:shadow-card hover:border-primary/30">
      <h3 className="line-clamp-2 min-h-[48px] text-[18px] font-bold leading-[24px] text-text">{title}</h3>
      <div className="mb-[14px] mt-3 flex items-center text-[15px]">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-bold text-white shadow-sm" style={{ background: accent }}>
          A
        </span>
        <span className="pl-2 text-textSub text-xs">{time}</span>
      </div>
      {item.category ? <div className="mb-2 text-[13px] font-medium text-textSubPc">{item.category}</div> : null}
      {preview ? <p className="line-clamp-3 text-[14px] leading-6 text-textSubPc">{preview}</p> : null}
    </Link>
  );
}

function DesktopFollowSection() {
  const { t } = useTranslation();
  const [traders, setTraders] = useState<FollowTrader[]>([]);

  useEffect(() => {
    fetchFollowTraders().then((rows) => setTraders((rows ?? []).slice(0, 3))).catch(() => setTraders([]));
  }, []);

  return (
    <section className="mx-auto mt-[120px] w-full max-w-[1300px] px-4 text-center text-text">
      <h2 className="pc-h1 m-0">{t('home.followTitle')}</h2>
      <p className="mt-[18px] text-[22px] text-textMute">{t('home.followSub')}</p>
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
        {traders.length === 0 ? (
          <div className="col-span-full py-10 text-center text-sm text-textSubPc">{t('common.noData')}</div>
        ) : traders.map((trader, index) => (
          <article key={trader.id} className="flex-1 rounded-2xl border border-line bg-card p-6 shadow-sm transition hover:shadow-pcCard hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TraderAvatar trader={trader} size={44} ringClassName="ring-line" />
                <div>
                  <div className="flex items-center gap-2 text-[16px] font-bold text-text">
                    {trader.name}
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold leading-none text-primary">LV{index + 2}</span>
                  </div>
                  <div className="mt-1 flex items-center text-[12px] leading-none text-textSubPc">
                    <span className="font-medium text-primary">{trader.style ?? '--'}</span>
                    <span className="ml-1">{t('home.strategist')}</span>
                  </div>
                </div>
              </div>
              <Link
                to="/follow"
                className="inline-flex h-8 items-center justify-center rounded-full bg-primary/10 px-4 text-[13px] font-semibold text-primary transition hover:bg-primary hover:text-white"
              >
                {t('home.follow')}
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 border-t border-line/60 pt-4 text-center">
              <div>
                <div className="text-[12px] text-textSubPc">{t('home.returnRate')}</div>
                <div className="num pc-price mt-1 text-[20px] font-bold text-up">
                  +{(Number(trader.pnlRate) * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[12px] text-textSubPc">{t('home.winRate')}</div>
                <div className="num pc-price mt-1 text-[20px] font-bold text-text">
                  {(Number(trader.winRate) * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <div className="text-[12px] text-textSubPc">{t('home.followers')}</div>
                <div className="num pc-price mt-1 text-[20px] font-bold text-text">
                  {trader.followers.toLocaleString()}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      <Link to="/follow" className="pc-btn-pill mx-auto mt-[40px]">
        {t('common.viewMore')}
      </Link>
    </section>
  );
}

function DesktopPortfolioCard({ item, onClick }: { item: PortfolioProduct; onClick: () => void }) {
  const { t, i18n } = useTranslation();
  const coins = item.coins.split(',').map((coin) => coin.trim()).filter(Boolean);
  const displayName = getPortfolioDisplayName(item.name, i18n.language, t);
  return (
    <button type="button" onClick={onClick} className="flex w-full flex-col rounded-2xl bg-bgSection p-6 text-left transition hover:shadow-pcCard hover:-translate-y-0.5">
      <div className="mb-2.5 flex items-start justify-between">
        <div>
          <CoinStack coins={coins} />
          <div className="mb-1.5 mt-3 text-[18px] font-bold text-text">{displayName}</div>
        </div>
        <span className="flex items-center gap-1 whitespace-nowrap text-[15px] font-medium text-primary">
          {t('home.goInvest')} <ArrowRight size={14} />
        </span>
      </div>
      <div className="flex items-center gap-2 text-[12px] leading-none">
        <span className="rounded-md bg-sky-500/10 px-2 py-1 font-medium text-sky-600 dark:text-sky-400">{t('discover.lowRisk')}</span>
        <span className="rounded-md bg-emerald-500/10 px-2 py-1 font-medium text-emerald-600 dark:text-emerald-400">{t('discover.stableYield')}</span>
      </div>
      <div className="mt-6 flex items-center justify-between text-[15px] font-medium text-text border-t border-line/60 pt-4">
        <span className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-line"><Clock3 size={14} /></span>
          {t('home.daysUnit', { days: item.durationDays })}
        </span>
        <span className="num pc-price truncate font-semibold">{Number(item.minAmount).toLocaleString()} ~ {Number(item.maxAmount).toLocaleString()} USDT</span>
      </div>
    </button>
  );
}

function CoinStack({ coins }: { coins: string[] }) {
  return (
    <span className="flex -space-x-2">
      {coins.slice(0, 3).map((coin) => (
        <span key={coin} className="inline-flex h-10 w-10 rounded-full ring-2 ring-bgSoft">
          <CoinLogo coin={coin} size={40} />
        </span>
      ))}
    </span>
  );
}

function HomeQuoteRow({
  row,
  tick,
  onClick,
}: {
  row: SymbolRow;
  tick?: WsTick;
  onClick: () => void;
}) {
  const price = tick?.price ?? row.price;
  const change = tick?.change ?? row.change;
  const changeNum = parseFiniteNumber(change);
  const up = changeNum !== null && changeNum >= 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-full grid-cols-12 items-center py-3.5 px-2 text-left hover:bg-[#F8FAFC] active:bg-[#F1F5F9] rounded-xl transition-colors duration-150"
    >
      <div className="col-span-5 flex min-w-0 items-center gap-2.5">
        <PairCoinIcon
          baseCoin={row.baseCoin}
          quoteCoin={row.quoteCoin}
          baseLogo={row.baseLogo}
          quoteLogo={row.quoteLogo}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 leading-none">
            <span className="text-[15px] font-bold text-text tracking-tight">{row.baseCoin}</span>
            <span className="text-[11px] font-medium text-textSub/75">/{row.quoteCoin}</span>
            <SymbolBadges row={row} className="inline-flex items-center" />
          </div>
          <div className="mt-1.5 text-[11px] leading-none text-textSub/75 truncate font-normal">
            {COIN_NAMES[row.baseCoin] ?? row.baseCoin}
          </div>
        </div>
      </div>
      <div className="col-span-4 text-right pr-2">
        <div className="text-[15px] font-bold leading-tight num text-text tracking-tight">
          {formatPrice(price, row.pricePrecision)}
        </div>
        <div className="mt-1 text-[11px] leading-tight text-textSub/75 num font-normal">
          ${formatPrice(price, row.pricePrecision)}
        </div>
      </div>
      <div className="col-span-3 text-right flex justify-end">
        <span
          className={`inline-flex h-[30px] min-w-[76px] items-center justify-center rounded-lg px-2.5 text-[13px] font-bold num tracking-tight transition-transform active:scale-95 ${
            changeNum === null
              ? 'bg-[#F3F4F6] text-[#9CA3AF]'
              : up
              ? 'bg-[#E6F9F0] text-[#00B578]'
              : 'bg-[#FFF0F0] text-[#FF4D4F]'
          }`}
        >
          {formatChangePercent(changeNum, row.changePrecision)}
        </span>
      </div>
    </button>
  );
}

function CryptoIcon({ coin }: { coin: string }) {
  const code = coin.toUpperCase();
  if (code === 'ETH') {
    return (
      <span className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F4F5F7]">
        <span className="h-4 w-4 rotate-45 bg-[#5E6673]" />
      </span>
    );
  }
  if (code === 'SOL') {
    return (
      <span className="inline-flex h-7 w-7 shrink-0 flex-col items-center justify-center gap-0.5 rounded-full bg-[#F2F7FF]">
        <span className="h-1.5 w-4 rounded bg-[#8D5CFF]" />
        <span className="h-1.5 w-4 rounded bg-[#44E6C0]" />
        <span className="h-1.5 w-4 rounded bg-[#F16CF2]" />
      </span>
    );
  }
  if (code === 'ATOM') {
    return <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#252849] text-[16px] text-white">✣</span>;
  }
  if (code === 'XRP') {
    return <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#20252B] text-[15px] font-bold text-white">X</span>;
  }
  if (code === 'LTC') {
    return <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#356BA7] text-[16px] font-bold text-white">Ł</span>;
  }
  if (code === 'USDC') {
    return <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4A90E2] text-[13px] font-bold text-white">$</span>;
  }
  if (code === 'DOGE') {
    return <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#D7B34C] text-[14px] font-bold text-white">Ð</span>;
  }
  if (code === 'BTC' || code === 'BCH') {
    return <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${code === 'BTC' ? 'bg-[#F5A623]' : 'bg-[#8BC34A]'} text-[17px] font-bold text-white`}>₿</span>;
  }
  return <CoinIcon coin={coin} size="sm" />;
}
