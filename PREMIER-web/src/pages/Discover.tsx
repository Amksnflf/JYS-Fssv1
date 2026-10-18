import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowRight,
  Bot,
  ChartNoAxesCombined,
  Clock3,
  Landmark,
  Search,
  ShieldCheck,
  Target,
  Upload,
  Wallet,
} from 'lucide-react';
import { CoinLogo } from '@/components/AsterUI';
import {
  fetchAiStrategies,
  fetchPortfolioProducts,
  type AiStrategy,
  type PortfolioProduct,
} from '@/api/finance';
import { fetchFollowTraders, type FollowTrader } from '@/api/follow';
import {
  deriveAiMeta,
  PcStrategyCard,
  percentText,
  StrategyIcon,
} from './finance/aiShared';
import { getPortfolioDisplayName } from './finance/portfolioShared';
import { useResponsive } from '@/hooks/useResponsive';
import { useCoinLogoMap } from '@/hooks/useCoinLogoMap';
import { PcContainer } from '@/components/pc';

const QUICK_ACTIONS = [
  { labelKey: 'profile.withdraw', path: '/assets/withdraw', icon: Upload },
  { labelKey: 'profile.deposit', path: '/assets/deposit', icon: ArrowDownToLine },
  { labelKey: 'profile.loan', path: '/finance/loan/1', icon: Landmark },
  { labelKey: 'profile.security', path: '/profile/security', icon: ShieldCheck },
  { labelKey: 'profile.portfolio', path: '/finance/portfolio', icon: Wallet },
];

export default function DiscoverPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { isPc } = useResponsive();
  const { logoMap: coinLogoMap, loading: coinLogoLoading } = useCoinLogoMap();
  const [strategies, setStrategies] = useState<AiStrategy[]>([]);
  const [portfolios, setPortfolios] = useState<PortfolioProduct[]>([]);
  const [traders, setTraders] = useState<FollowTrader[]>([]);

  useEffect(() => {
    Promise.allSettled([fetchAiStrategies(), fetchPortfolioProducts(), fetchFollowTraders()]).then(([strategyRes, portfolioRes, traderRes]) => {
      if (strategyRes.status === 'fulfilled') setStrategies(strategyRes.value ?? []);
      if (portfolioRes.status === 'fulfilled') setPortfolios(portfolioRes.value ?? []);
      if (traderRes.status === 'fulfilled') setTraders(traderRes.value ?? []);
    });
  }, []);

  const goQuick = (path: string) => {
    nav(path);
  };

  const featuredCoins = useMemo(() => {
    const fromPortfolios = portfolios
      .flatMap((item) => item.coins.split(','))
      .map((coin) => coin.trim().toUpperCase())
      .filter(Boolean);

    const fromStrategies = strategies
      .flatMap((item) => {
        const meta = deriveAiMeta(item);
        return [meta.leftCoin, meta.rightCoin];
      })
      .map((coin) => coin.trim().toUpperCase())
      .filter(Boolean);

    return Array.from(new Set([...fromPortfolios, ...fromStrategies, 'BTC', 'ETH', 'USDT'])).slice(0, 3);
  }, [portfolios, strategies]);

  if (isPc) {
    return (
      <div className="bg-bg py-12 text-text">
        <PcContainer>
          <div className="text-center">
            <h1 className="pc-h1 m-0">{t('discover.smartTitle')}</h1>
            <p className="mt-4 text-[20px] text-textMute">{t('discover.smartDesc')}</p>
          </div>

          <div className="mt-10 grid grid-cols-5 gap-4">
            {QUICK_ACTIONS.map(({ labelKey, path, icon: Icon }) => (
              <button key={labelKey} onClick={() => goQuick(path)} className="flex flex-col items-center gap-3 rounded-lg border border-line bg-bg py-6 transition hover:shadow-pcCard">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bgSection">
                  <Icon size={22} strokeWidth={2.2} />
                </span>
                <span className="text-[14px] font-medium">{t(labelKey)}</span>
              </button>
            ))}
          </div>

          <section className="mt-16">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="pc-h2 m-0">{t('discover.follow')}</h2>
                <p className="mt-2 text-[14px] text-textSubPc">{t('follow.desc')}</p>
              </div>
              <button onClick={() => nav('/follow')} className="pc-btn-ghost">{t('common.viewMore')}</button>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-5">
              {traders.slice(0, 3).map((trader) => (
                <PcFollowCard key={trader.id} trader={trader} onClick={() => nav('/follow')} />
              ))}
            </div>
          </section>

          <section className="mt-16">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="pc-h2 m-0">{t('discover.aiStrategy')}</h2>
                <p className="mt-2 text-[14px] text-textSubPc">{t('home.aiSlogan')}</p>
              </div>
              <button onClick={() => nav('/finance')} className="pc-btn-ghost">{t('common.viewMore')}</button>
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {strategies.slice(0, 8).map((strategy) => (
                <PcStrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  logoMap={coinLogoMap}
                  coinLogoLoading={coinLogoLoading}
                  onOpen={() => nav(`/finance/ai/${strategy.id}`)}
                  onUse={() => nav(`/finance/ai/${strategy.id}`)}
                />
              ))}
            </div>
          </section>

          <section id="portfolio-section" className="mt-16 scroll-mt-6">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="pc-h2 m-0">{t('discover.portfolio')}</h2>
                <p className="mt-2 text-[14px] text-textSubPc">{t('discover.portfolioDesc')}</p>
              </div>
              <button onClick={() => nav('/finance/portfolio')} className="pc-btn-ghost">{t('common.viewMore')}</button>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-5">
              {portfolios.map((item) => (
                <PcDiscoverPortfolioCard
                  key={item.id}
                  item={item}
                  logoMap={coinLogoMap}
                  coinLogoLoading={coinLogoLoading}
                  onClick={() => nav(`/finance/portfolio/${item.id}`)}
                />
              ))}
            </div>
          </section>
        </PcContainer>
      </div>
    );
  }

  return (
    <div className="aster-page pb-28">
      <button
        type="button"
        onClick={() => nav('/market')}
        className="flex h-11 w-full items-center gap-3 rounded-2xl bg-white border border-slate-200/80 px-4 text-left text-xs text-slate-400 shadow-sm transition hover:border-cyan-300"
      >
        <Search size={17} className="text-slate-400" />
        <span>{t('discover.searchPair')}</span>
      </button>

      <div
        role="button"
        tabIndex={0}
        onClick={() => nav('/finance')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            nav('/finance');
          }
        }}
        className="mt-3.5 w-full rounded-3xl bg-gradient-to-br from-cyan-50/70 via-sky-50/50 to-white p-5 border border-cyan-100 shadow-sm relative overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="min-w-0 flex-1">
            <div className="text-base font-bold leading-snug text-cyan-700">{t('discover.smartTitle')}</div>
            <div className="mt-2 text-xs leading-relaxed text-slate-600">{t('discover.smartDesc')}</div>
            <div className="mt-3.5 flex flex-row flex-wrap items-center gap-2">
              <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-cyan-100/70 px-2.5 py-0.5 text-xs font-semibold text-cyan-800">
                {t('discover.grid')}
              </span>
              <span className="inline-flex shrink-0 -space-x-2">
                {featuredCoins.map((coin) => (
                  <CoinLogoMark key={coin} coin={coin} logo={coinLogoMap.get(coin)} loading={coinLogoLoading} />
                ))}
              </span>
              <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold text-slate-700">
                +334
              </span>
            </div>
          </div>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600">
            <ChartNoAxesCombined size={36} strokeWidth={1.8} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2 text-center rounded-3xl bg-white p-3.5 border border-slate-100 shadow-sm">
        {QUICK_ACTIONS.map(({ labelKey, path, icon: Icon }) => (
          <button key={labelKey} onClick={() => goQuick(path)} className="group flex min-w-0 flex-col items-center gap-1.5 py-1">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500/10 to-sky-500/15 text-cyan-600 border border-cyan-100/70 transition group-hover:scale-105 active:scale-95 shadow-none">
              <Icon size={20} strokeWidth={2.2} />
            </span>
            <span className="w-full px-0.5 text-[11px] font-medium leading-tight text-slate-700 group-hover:text-cyan-600 transition">{t(labelKey)}</span>
          </button>
        ))}
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-800">{t('discover.follow')}</h2>
          <button onClick={() => nav('/follow')} className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 transition">
            {t('common.viewMore')}
          </button>
        </div>
        <div className="space-y-3">
          {traders.slice(0, 3).map((trader) => (
            <FollowCard key={trader.id} trader={trader} onClick={() => nav('/follow')} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-800">{t('discover.aiStrategy')}</h2>
          <button onClick={() => nav('/finance')} className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 transition">
            {t('common.viewMore')}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {strategies.slice(0, 4).map((strategy) => (
            <AiCard key={strategy.id} strategy={strategy} logoMap={coinLogoMap} coinLogoLoading={coinLogoLoading} onUse={() => nav(`/finance/ai/${strategy.id}`)} />
          ))}
        </div>
      </section>

      <section id="portfolio-section" className="mt-8 scroll-mt-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-slate-800">{t('discover.portfolio')}</h2>
          <button onClick={() => nav('/finance/portfolio')} className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 transition">
            {t('common.viewMore')}
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-3">{t('discover.portfolioDesc')}</p>
        <div className="space-y-3">
          {portfolios.map((item) => (
            <PortfolioCard
              key={item.id}
              item={item}
              logoMap={coinLogoMap}
              coinLogoLoading={coinLogoLoading}
              onClick={() => nav(`/finance/portfolio/${item.id}`)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function FollowCard({ trader, onClick }: { trader: FollowTrader; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button type="button" onClick={onClick} className="w-full rounded-2xl bg-white p-4 text-left border border-slate-100 shadow-sm transition hover:shadow-md active:scale-[0.99]">
      <div className="flex items-center gap-3">
        <TraderAvatar trader={trader} size={28} ringClassName="ring-cyan-100" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-slate-800">{trader.name}</div>
          <div className="mt-0.5 truncate text-[11px] text-slate-400 font-medium">{trader.style ?? '--'}</div>
        </div>
        <ArrowRight size={16} className="text-slate-400" />
      </div>
      <div className="mt-3.5 grid grid-cols-3 gap-2 text-center text-xs pt-3 border-t border-slate-100">
        <Metric value={`${(Number(trader.winRate) * 100).toFixed(0)}%`} label={t('follow.winRate')} />
        <Metric value={`+${(Number(trader.pnlRate) * 100).toFixed(1)}%`} label={t('follow.pnlRate')} />
        <Metric value={trader.followers.toLocaleString()} label={t('follow.followers')} />
      </div>
    </button>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="num font-bold text-emerald-500">{value}</div>
      <div className="mt-0.5 text-[10px] text-slate-400 font-medium">{label}</div>
    </div>
  );
}

function AiCard({
  strategy,
  logoMap,
  coinLogoLoading,
  onUse,
}: {
  strategy: AiStrategy;
  logoMap: Map<string, string | null>;
  coinLogoLoading: boolean;
  onUse: () => void;
}) {
  const { t } = useTranslation();
  const meta = deriveAiMeta(strategy);
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between">
          <StrategyIcon strategy={strategy} size={36} logoMap={logoMap} loading={coinLogoLoading} />
          <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
            <Bot size={14} className="text-cyan-500" />
            <span className="num">{strategy.userCount}</span>
          </span>
        </div>
        <div className="mt-3 text-sm font-bold text-slate-800">{meta.pair}</div>
        <div className="num mt-1 text-base font-extrabold text-emerald-500">+{percentText(strategy.maxApr)}</div>
      </div>
      <button onClick={onUse} className="mt-4 h-8 w-full rounded-xl bg-gradient-to-r from-[#00C4DF] to-[#0284C7] text-xs font-bold text-white shadow-sm shadow-cyan-500/20 transition active:scale-95">
        {t('common.use')}
      </button>
    </article>
  );
}

function PortfolioCard({
  item,
  logoMap,
  coinLogoLoading,
  onClick,
}: {
  item: PortfolioProduct;
  logoMap: Map<string, string | null>;
  coinLogoLoading: boolean;
  onClick: () => void;
}) {
  const { t, i18n } = useTranslation();
  const coins = item.coins.split(',').map((coin) => coin.trim()).filter(Boolean);
  const displayName = getPortfolioDisplayName(item.name, i18n.language, t);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl bg-white p-4 text-left border border-slate-100 shadow-sm transition hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center">
            <CoinStack coins={coins} logoMap={logoMap} loading={coinLogoLoading} />
            <span className="ml-2 text-sm font-bold text-slate-800">{displayName}</span>
          </div>
          <div className="mt-2.5 flex gap-1.5 text-[10px]">
            <span className="rounded-full bg-cyan-50 border border-cyan-100 px-2 py-0.5 font-semibold text-cyan-700">{t('discover.lowRisk')}</span>
            <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">{t('discover.stableYield')}</span>
          </div>
        </div>
        <span className="flex items-center gap-1 text-xs font-bold text-cyan-600">
          {t('discover.invest')}
          <ArrowRight size={13} />
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-600 pt-3 border-t border-slate-100">
        <span className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Clock3 size={13} />
          </span>
          {item.durationDays} {t('finance.days')}
        </span>
        <span className="num text-[11px] text-slate-500 font-medium">
          {Number(item.minAmount).toLocaleString()} ~ {Number(item.maxAmount).toLocaleString()} USDT
        </span>
      </div>
    </button>
  );
}

function CoinStack({
  coins,
  logoMap,
  loading,
}: {
  coins: string[];
  logoMap: Map<string, string | null>;
  loading: boolean;
}) {
  return (
    <span className="flex -space-x-2">
      {coins.slice(0, 3).map((coin) => (
        <CoinBubble key={coin} coin={coin} logo={logoMap.get(coin.toUpperCase())} loading={loading} />
      ))}
    </span>
  );
}

function CoinBubble({ coin, logo, loading = false }: { coin: string; logo?: string | null; loading?: boolean }) {
  return (
    <span className="inline-flex rounded-full ring-2 ring-bgSoft">
      <CoinLogo coin={coin} logo={logo} size={28} loading={loading && !logo} />
    </span>
  );
}

function AvatarMark({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-bgSoft"
      style={{ background: color }}
    >
      {text}
    </span>
  );
}

function TraderAvatar({
  trader,
  size,
  ringClassName,
}: {
  trader: FollowTrader;
  size: number;
  ringClassName?: string;
}) {
  const imageUrl = resolveImageUrl(trader.avatar);
  const fallback = (trader.name || '?').slice(0, 1).toUpperCase();

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={trader.name}
        className={`rounded-full object-cover ring-2 ${ringClassName ?? 'ring-bg'}`}
        style={{ width: size, height: size, flexShrink: 0 }}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-[#1F7A2E] font-bold text-white ring-2 ${ringClassName ?? 'ring-bg'}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(12, Math.floor(size / 2.4)),
        flexShrink: 0,
      }}
    >
      {fallback}
    </span>
  );
}

function resolveImageUrl(value?: string) {
  if (!value) return '';
  if (value.startsWith('data:') || value.startsWith('blob:')) return value;
  const normalized = normalizeUploadPath(value);
  if (normalized.startsWith('/uploads/')) return `/api${normalized}`;
  return normalized;
}

function normalizeUploadPath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/api/uploads/')) return trimmed;
  if (trimmed.startsWith('api/uploads/')) return `/${trimmed}`;
  if (trimmed.startsWith('/uploads/')) return trimmed;
  if (trimmed.startsWith('uploads/')) return `/${trimmed}`;

  const apiUploadsIndex = trimmed.indexOf('/api/uploads/');
  if (apiUploadsIndex >= 0) return trimmed.slice(apiUploadsIndex);

  const uploadsIndex = trimmed.indexOf('/uploads/');
  if (uploadsIndex >= 0) return trimmed.slice(uploadsIndex);

  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function CoinLogoMark({ coin, logo, loading = false }: { coin: string; logo?: string | null; loading?: boolean }) {
  return (
    <span className="inline-flex rounded-full ring-2 ring-bgSoft">
      <CoinLogo coin={coin} logo={logo} size={28} loading={loading} />
    </span>
  );
}

function PcFollowCard({ trader, onClick }: { trader: FollowTrader; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button type="button" onClick={onClick} className="rounded-lg border border-line bg-bg p-5 text-left transition hover:shadow-pcCard">
      <div className="flex items-center gap-3">
        <TraderAvatar trader={trader} size={32} ringClassName="ring-bg" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[18px] font-semibold">{trader.name}</div>
          <div className="mt-1 truncate text-[13px] text-textSubPc">{trader.style ?? '--'}</div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[13px]">
        <Metric value={`${(Number(trader.winRate) * 100).toFixed(0)}%`} label={t('follow.winRate')} />
        <Metric value={`+${(Number(trader.pnlRate) * 100).toFixed(1)}%`} label={t('follow.pnlRate')} />
        <Metric value={trader.followers.toLocaleString()} label={t('follow.followers')} />
      </div>
    </button>
  );
}

function PcDiscoverPortfolioCard({
  item,
  logoMap,
  coinLogoLoading,
  onClick,
}: {
  item: PortfolioProduct;
  logoMap: Map<string, string | null>;
  coinLogoLoading: boolean;
  onClick: () => void;
}) {
  const { t, i18n } = useTranslation();
  const coins = item.coins.split(',').map((coin) => coin.trim()).filter(Boolean);
  const displayName = getPortfolioDisplayName(item.name, i18n.language, t);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-line bg-bgSection p-5 text-left transition hover:shadow-pcCard"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CoinStack coins={coins} logoMap={logoMap} loading={coinLogoLoading} />
            <span className="text-[18px] font-semibold text-text">{displayName}</span>
          </div>
          <div className="mt-3 flex gap-2 text-[12px]">
            <span className="rounded-md bg-sky-500/10 px-2.5 py-1 font-medium text-sky-600 dark:text-sky-400">{t('discover.lowRisk')}</span>
            <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-600 dark:text-emerald-400">{t('discover.stableYield')}</span>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[14px] font-medium text-text">
          {t('discover.invest')}
          <ArrowRight size={14} />
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between text-[14px] text-text">
        <span className="flex items-center gap-2">
          <Clock3 size={16} className="text-textSubPc" />
          {item.durationDays} {t('finance.days')}
        </span>
        <span className="num pc-price truncate">{Number(item.minAmount).toLocaleString()} ~ {Number(item.maxAmount).toLocaleString()} USDT</span>
      </div>
    </button>
  );
}
