import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, Square, User } from 'lucide-react';
import { CoinLogo } from '@/components/AsterUI';
import {
  fetchAiStrategies,
  fetchMyAiOrders,
  type AiStrategy,
  type AiStrategyOrderVO,
} from '@/api/finance';
import { getToken } from '@/api/http';
import { useUserStore } from '@/store/userStore';
import {
  AiSubscribeSheet,
  deriveAiMeta,
  LevelBadge,
  maskAccount,
  MiniStrategyChart,
  PcStrategyCard,
  percentText,
  StatPill,
  StrategyIcon,
} from './finance/aiShared';
import { useResponsive } from '@/hooks/useResponsive';
import { useCoinLogoMap } from '@/hooks/useCoinLogoMap';
import { PcContainer } from '@/components/pc';

export default function FinancePage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { isPc } = useResponsive();
  const { logoMap: coinLogoMap, loading: coinLogoLoading } = useCoinLogoMap();
  const user = useUserStore((s) => s.user);
  const refreshUser = useUserStore((s) => s.refresh);
  const [strategies, setStrategies] = useState<AiStrategy[]>([]);
  const [aiOrders, setAiOrders] = useState<AiStrategyOrderVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AiStrategy | null>(null);

  useEffect(() => {
    let cancelled = false;
    refreshUser().catch(() => {});
    setLoading(true);
    const requests = [fetchAiStrategies(), getToken() ? fetchMyAiOrders(1, 1, 10) : Promise.resolve(null)] as const;
    Promise.allSettled(requests).then(([strategyRes, orderRes]) => {
      if (cancelled) return;
      if (strategyRes.status === 'fulfilled') setStrategies(strategyRes.value ?? []);
      if (orderRes.status === 'fulfilled') setAiOrders(orderRes.value?.records ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const activeProfit = useMemo(
    () => aiOrders.reduce((sum, o) => sum + Number(o.liveProfit ?? o.totalProfit ?? 0), 0),
    [aiOrders]
  );
  const totalUsers = strategies.reduce((sum, s) => sum + Number(s.userCount || 0), 0);

  if (isPc) {
    return (
      <div className="bg-bg py-12 text-text">
        <PcContainer>
          <div className="text-center">
            <h1 className="pc-h1 m-0">{t('aiFinance.title')}</h1>
            <p className="mt-4 text-[20px] font-medium text-textMute">{t('home.aiSlogan')}</p>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-5">
            <div className="rounded-lg border border-line bg-bg p-6 text-center">
              <div className="text-[14px] text-textSubPc">{t('aiFinance.users')}</div>
              <div className="num pc-price mt-3 text-[36px] font-semibold text-text">{totalUsers.toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-line bg-bg p-6 text-center">
              <div className="text-[14px] text-textSubPc">{t('aiFinance.earned')}</div>
              <div className="num pc-price mt-3 text-[36px] font-semibold text-primary">{activeProfit.toFixed(2)}</div>
            </div>
            <div className="rounded-lg border border-line bg-bg p-6 text-center">
              <div className="text-[14px] text-textSubPc">{t('aiFinance.totalStrategyProfit')}</div>
              <div className="num pc-price mt-3 text-[36px] font-semibold text-up">{activeProfit.toFixed(2)}</div>
            </div>
          </div>

          <div className="mt-6 flex h-12 items-center rounded-lg border border-line bg-bg px-4 text-[14px]">
            <Bell size={16} className="mr-2 fill-text text-text" />
            {t('aiFinance.createdStrategy', { user: maskAccount(user?.email || user?.account) })}
          </div>

          <div className="mt-12 flex items-end justify-between">
            <div>
              <h2 className="pc-h2 m-0">{t('aiFinance.strategySquare')}</h2>
              <p className="mt-3 text-[14px] text-textSubPc">{t('aiFinance.currentLevel')} <LevelBadge level={user?.vipLevel ?? 1} /></p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => nav('/finance/ai/rules')} className="pc-btn-ghost">{t('aiFinance.levelRules')}</button>
              <button onClick={() => nav('/finance/ai/orders')} className="pc-btn-primary">{t('aiFinance.orders')}</button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-6">
            {loading ? (
              <p className="col-span-3 py-12 text-center text-[14px] text-textSubPc">{t('common.loading')}</p>
            ) : (
              strategies.map((strategy) => (
                <PcStrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  logoMap={coinLogoMap}
                  coinLogoLoading={coinLogoLoading}
                  onOpen={() => nav(`/finance/ai/${strategy.id}`)}
                  onUse={() => setSelected(strategy)}
                />
              ))
            )}
          </div>
        </PcContainer>
        <AiSubscribeSheet strategy={selected} open={Boolean(selected)} onClose={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-bg pb-24">
      <header className="sticky top-0 z-30 flex h-[74px] items-center justify-between border-b border-line bg-bg/95 px-4 backdrop-blur">
        <button className="flex h-10 w-10 items-center justify-start" onClick={() => nav(-1)} aria-label="back">
          <ChevronLeft size={25} />
        </button>
        <div className="text-lg font-semibold">{t('aiFinance.title')}</div>
        <button className="text-base font-medium text-[#2F7D32]" onClick={() => nav('/finance/ai/orders')}>
          {t('aiFinance.orders')}
        </button>
      </header>

      <div className="px-4 pt-5">
        <button
          onClick={() => nav('/finance/ai/rules')}
          className="flex h-[52px] w-full items-center justify-between rounded-xl bg-bgSoft px-4 text-sm"
        >
          <span className="flex items-center gap-2">
            <Square size={14} className="fill-text text-text" />
            {t('aiFinance.currentLevel')} <LevelBadge level={user?.vipLevel ?? 1} />
          </span>
          <span className="text-[#2F7D32]">{t('aiFinance.levelRules')}</span>
        </button>

        <section className="mt-6 overflow-hidden rounded-xl bg-bgSoft">
          <div className="grid grid-cols-2 px-4 py-5">
            <StatPill icon="user" label={t('aiFinance.users')} value={totalUsers.toLocaleString()} />
            <div className="border-l border-dashed border-textSub/60">
              <StatPill icon="coin" label={t('aiFinance.earned')} value={activeProfit.toFixed(2)} />
            </div>
          </div>
        </section>

        <div className="mt-6 flex h-9 items-center rounded border border-line px-3 text-xs">
          <Bell size={16} className="mr-2 fill-text text-text" />
          {t('aiFinance.createdStrategy', {
            user: maskAccount(user?.email || user?.account),
          })}
        </div>

        <section className="mt-7 flex h-[58px] items-center justify-center gap-3 rounded-xl border border-line">
          <CoinLogo coin="USDT" logo={coinLogoMap.get('USDT')} size={32} loading={coinLogoLoading} />
          <span className="text-sm">
            <span className="num">{activeProfit.toFixed(2)}</span> {t('aiFinance.totalStrategyProfit')}
          </span>
        </section>

        <div className="mt-8 flex items-center gap-2 text-xl font-bold">
          <Square size={15} className="fill-text text-text" />
          {t('aiFinance.strategySquare')}
        </div>

        <div className="mt-4 space-y-6">
          {loading ? (
            <p className="py-8 text-center text-sm text-textSub">{t('common.loading')}</p>
          ) : (
            strategies.map((strategy) => (
              <StrategyCard
                key={strategy.id}
                strategy={strategy}
                logoMap={coinLogoMap}
                coinLogoLoading={coinLogoLoading}
                onOpen={() => nav(`/finance/ai/${strategy.id}`)}
                onUse={() => setSelected(strategy)}
              />
            ))
          )}
        </div>
      </div>

      <AiSubscribeSheet strategy={selected} open={Boolean(selected)} onClose={() => setSelected(null)} />
    </div>
  );
}

function StrategyCard({
  strategy,
  logoMap,
  coinLogoLoading,
  onOpen,
  onUse,
}: {
  strategy: AiStrategy;
  logoMap: Map<string, string | null>;
  coinLogoLoading: boolean;
  onOpen: () => void;
  onUse: () => void;
}) {
  const { t } = useTranslation();
  const meta = deriveAiMeta(strategy);
  return (
    <article>
      <button
        className="w-full overflow-hidden rounded-[16px] border border-lineSolid bg-white text-left shadow-[0_6px_16px_rgba(4,3,3,0.045)]"
        onClick={onOpen}
      >
        <div className="flex items-center justify-between px-3.5 pb-2.5 pt-3.5">
          <div className="flex items-center gap-2.5">
            <StrategyIcon strategy={strategy} size={32} logoMap={logoMap} loading={coinLogoLoading} />
            <span className="text-[14px] font-medium text-text">{meta.pair}</span>
          </div>
          <span className="text-[14px] text-text">{strategy.strategyType}</span>
        </div>
        <div className="h-[46px] overflow-hidden rounded-b-[8px] bg-white pb-[4px]">
          <MiniStrategyChart seed={strategy.id} height={42} />
        </div>
      </button>
      <div className="px-1 pb-0 pt-3">
        <div className="grid grid-cols-2 gap-x-3 text-[13px] leading-[1.65]">
          <div>
            <Row label={t('aiFinance.maxApr')} value={percentText(strategy.maxApr)} valueClass="text-[#2F7D32]" compact />
            <Row label={t('aiFinance.investAmount')} value={meta.minValue} compact />
          </div>
          <div className="border-l border-dashed border-textSub/60 pl-3">
            <Row label={t('aiFinance.maxDrawdown')} value={percentText(strategy.maxDrawdown)} valueClass="text-[#2F7D32]" compact />
            <Row label={t('aiFinance.runTime')} value={meta.runTime} compact />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-[13px]">
            <LevelBadge level={strategy.levelRequired || 0} />
            <span className="flex items-center gap-2">
              <User size={16} className="fill-[#2F7D32] text-[#2F7D32]" />
              <span className="num">{strategy.userCount}</span>
            </span>
          </div>
          <button onClick={onUse} className="h-10 w-[96px] rounded-full bg-text text-[15px] font-medium text-bg">
            {t('common.use')}
          </button>
        </div>
      </div>
    </article>
  );
}

function Row({
  label,
  value,
  valueClass = '',
  stacked = false,
  compact = false,
}: {
  label: string;
  value: string;
  valueClass?: string;
  stacked?: boolean;
  compact?: boolean;
}) {
  if (stacked) {
    return (
      <div className="mt-1.5">
        <div>{label}</div>
        <div className={`num font-medium ${valueClass}`}>{value}</div>
      </div>
    );
  }
  if (compact) {
    return (
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className={`num shrink-0 font-medium ${valueClass}`}>{value}</span>
      </div>
    );
  }
  return (
    <div className="mt-1 flex justify-between gap-2">
      <span>{label}</span>
      <span className={`num font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}


