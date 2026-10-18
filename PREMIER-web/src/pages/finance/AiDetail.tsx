import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { fetchAiStrategies, type AiStrategy } from '@/api/finance';
import {
  AiSubscribeSheet,
  deriveAiMeta,
  MiniStrategyChart,
  percentText,
  StatPill,
  StrategyIcon,
} from './aiShared';
import { useResponsive } from '@/hooks/useResponsive';
import { useCoinLogoMap } from '@/hooks/useCoinLogoMap';
import { PcContainer } from '@/components/pc';

export default function AiDetailPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { id } = useParams();
  const { isPc } = useResponsive();
  const { logoMap: coinLogoMap, loading: coinLogoLoading } = useCoinLogoMap();
  const [strategies, setStrategies] = useState<AiStrategy[]>([]);
  const [selected, setSelected] = useState<AiStrategy | null>(null);

  useEffect(() => {
    fetchAiStrategies().then((rows) => setStrategies(rows ?? [])).catch(() => {});
  }, []);

  const strategy = strategies.find((item) => String(item.id) === id) ?? null;
  const meta = strategy ? deriveAiMeta(strategy) : null;

  if (!strategy || !meta) {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-bg">
        <Header onBack={() => nav('/finance')} />
        <p className="px-4 pt-10 text-center text-sm text-textSub">{t('common.loading')}</p>
      </div>
    );
  }

  if (isPc) {
    return (
      <div className="bg-bg py-10 text-text">
        <PcContainer>
          <button onClick={() => nav('/finance')} className="mb-6 flex items-center gap-1 text-[14px] text-textSubPc hover:text-text">
            <ChevronLeft size={18} /> {t('common.back', { defaultValue: 'Back' })}
          </button>

          <div className="grid grid-cols-[1fr_360px] gap-8">
            <div>
              <div className="rounded-lg border border-line bg-bgSection px-6 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StrategyIcon strategy={strategy} size={48} logoMap={coinLogoMap} loading={coinLogoLoading} />
                    <div>
                      <div className="text-[20px] font-semibold text-text">{meta.pair}</div>
                      <div className="text-[13px] text-textSubPc">{strategy.strategyType}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <StatPill icon="user" label={t('aiFinance.users')} value={Number(strategy.userCount || 0).toLocaleString()} />
                    <StatPill icon="coin" label={t('aiFinance.followingFunds')} value={meta.followerFund} />
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-4">
                <RateBox label={t('aiFinance.last3Days')} value={meta.day3} />
                <RateBox label={t('aiFinance.last7Days')} value={meta.day7} />
                <RateBox label={t('aiFinance.last10Days')} value={meta.day10} />
              </div>

              <div className="mt-8 rounded-lg border border-line bg-bg p-6">
                <h2 className="pc-card-title">{t('aiFinance.whatIs', { type: strategy.strategyType })}</h2>
                <p className="mt-5 text-[14px] leading-7 text-textSubPc">
                  {t('aiFinance.strategyPitch1')}
                  <br />
                  {t('aiFinance.strategyPitch2')}
                </p>
              </div>
            </div>

            <aside className="rounded-lg border border-line bg-bg p-6">
              <h3 className="pc-card-title">{t('aiFinance.strategyDetails', { defaultValue: 'Strategy Details' })}</h3>
              <div className="mt-4 space-y-4">
                <InfoRow label={t('aiFinance.runTime')} value={meta.runTime} />
                <InfoRow label={t('aiFinance.maxApr')} value={percentText(strategy.maxApr)} />
                <InfoRow label={t('aiFinance.maxDrawdown')} value={percentText(strategy.maxDrawdown)} />
                <InfoRow label={t('aiFinance.intervalLow')} value={meta.minValue} />
                <InfoRow label={t('aiFinance.gridRate')} value={meta.gridRate} />
                <InfoRow label={t('aiFinance.maxServiceFee')} value={meta.maxServiceFee} />
              </div>
              <button onClick={() => setSelected(strategy)} className="pc-btn-primary mt-6 w-full">
                {t('aiFinance.useStrategy')}
              </button>
            </aside>
          </div>
        </PcContainer>
        <AiSubscribeSheet strategy={selected} open={Boolean(selected)} onClose={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-bg pb-28">
      <Header onBack={() => nav('/finance')} />

      <main className="px-4 pt-5">
        <section className="overflow-hidden rounded-[16px] border border-lineSolid bg-white shadow-[0_6px_16px_rgba(4,3,3,0.045)]">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <StrategyIcon strategy={strategy} size={36} logoMap={coinLogoMap} loading={coinLogoLoading} />
                <span className="text-[15px] font-medium">{meta.pair}</span>
              </div>
              <span className="text-[14px]">{strategy.strategyType}</span>
            </div>
          </div>
          <div className="h-[68px] bg-[#E6FFF0]">
            <MiniStrategyChart seed={strategy.id} height={68} />
          </div>
          <div className="px-4 py-4">
            <div className="grid grid-cols-2">
              <StatPill icon="user" label={t('aiFinance.users')} value={Number(strategy.userCount || 0).toLocaleString()} />
              <div className="border-l border-dashed border-textSub/60">
                <StatPill icon="coin" label={t('aiFinance.followingFunds')} value={meta.followerFund} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-3 gap-2">
          <RateBox label={t('aiFinance.last3Days')} value={meta.day3} />
          <RateBox label={t('aiFinance.last7Days')} value={meta.day7} />
          <RateBox label={t('aiFinance.last10Days')} value={meta.day10} />
        </section>

        <section className="mt-7 rounded-[18px] border border-lineSolid bg-white px-4 py-5 shadow-[0_8px_18px_rgba(4,3,3,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold">{t('aiFinance.strategyDetails', { defaultValue: 'Strategy Details' })}</span>
            <span className="text-sm text-[#2F7D32]">{strategy.strategyType}</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-4 text-[15px] leading-[1.9]">
            <div>
              <InfoRow label={t('aiFinance.maxApr')} value={percentText(strategy.maxApr)} valueClass="text-[#2F7D32]" stacked />
              <InfoRow label={t('aiFinance.intervalLow')} value={meta.minValue} stacked />
              <InfoRow label={t('aiFinance.gridRate')} value={meta.gridRate} stacked />
            </div>
            <div className="border-l border-dashed border-textSub/60 pl-4">
              <InfoRow label={t('aiFinance.maxDrawdown')} value={percentText(strategy.maxDrawdown)} valueClass="text-[#2F7D32]" stacked />
              <InfoRow label={t('aiFinance.runTime')} value={meta.runTime} stacked />
              <InfoRow label={t('aiFinance.maxServiceFee')} value={meta.maxServiceFee} stacked />
            </div>
          </div>
        </section>

        <section className="mt-7 rounded-[18px] border border-lineSolid bg-white px-4 py-5 shadow-[0_8px_18px_rgba(4,3,3,0.05)]">
          <h2 className="text-base font-semibold">{t('aiFinance.whatIs', { type: strategy.strategyType })}</h2>
          <p className="mt-4 text-[15px] leading-8 text-textSub">
            {t('aiFinance.strategyPitch1')}
            <br />
            {t('aiFinance.strategyPitch2')}
          </p>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-bg px-4 pb-safe pt-3">
        <button onClick={() => setSelected(strategy)} className="btn-primary w-full">
          {t('aiFinance.useStrategy')}
        </button>
      </div>

      <AiSubscribeSheet strategy={selected} open={Boolean(selected)} onClose={() => setSelected(null)} />
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-30 flex h-[74px] items-center justify-between border-b border-line bg-bg/95 px-4 backdrop-blur">
      <button className="flex h-10 w-10 items-center justify-start" onClick={onBack} aria-label="back">
        <ChevronLeft size={25} />
      </button>
      <div className="text-lg font-semibold">{t('aiFinance.title')}</div>
      <div className="w-10" />
    </header>
  );
}

function RateBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-bgSoft px-4 py-4">
      <div className="text-sm">{label}</div>
      <div className="num mt-2 text-2xl font-medium text-[#2F7D32]">{value}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  valueClass = '',
  stacked = false,
}: {
  label: string;
  value: string;
  valueClass?: string;
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <div className="mt-1.5">
        <div>{label}</div>
        <div className={`num font-medium ${valueClass}`}>{value}</div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={`num ${valueClass}`}>{value}</span>
    </div>
  );
}
