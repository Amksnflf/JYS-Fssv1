import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, FileSearch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchMyAiOrders, stopAiStrategy, type AiStrategyOrderVO } from '@/api/finance';
import { toast } from '@/components/Toast';

type TabKey = 'working' | 'ended';

export default function AiOrdersPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [tab, setTab] = useState<TabKey>('working');
  const [rows, setRows] = useState<AiStrategyOrderVO[]>([]);

  const reload = () => {
    fetchMyAiOrders(tab === 'working' ? 1 : 2, 1, 30)
      .then((page) => setRows(page?.records ?? []))
      .catch(() => setRows([]));
  };

  useEffect(() => {
    reload();
    const timer = window.setInterval(reload, 5000);
    return () => window.clearInterval(timer);
  }, [tab]);

  const stop = async (order: AiStrategyOrderVO) => {
    if (!window.confirm(t('finance.confirmStopAi'))) return;
    try {
      await stopAiStrategy(order.id);
      toast.success(t('finance.aiStopped'));
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? t('finance.operationFailed'));
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-bg pb-10">
      <header className="sticky top-0 z-30 flex h-[74px] items-center justify-between border-b border-line bg-bg/95 px-4 backdrop-blur">
        <button className="flex h-10 w-10 items-center justify-start" onClick={() => nav('/finance')} aria-label="back">
          <ChevronLeft size={25} />
        </button>
        <div className="text-lg font-semibold">{t('finance.historyOrders')}</div>
        <div className="w-10" />
      </header>

      <div className="grid h-[72px] grid-cols-2 border-b border-line text-base">
        <TabButton active={tab === 'working'} onClick={() => setTab('working')}>
          {t('finance.working')}
        </TabButton>
        <TabButton active={tab === 'ended'} onClick={() => setTab('ended')}>
          {t('finance.ended')}
        </TabButton>
      </div>

      {rows.length === 0 ? (
        <div className="pt-16 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-text">
            <FileSearch size={58} strokeWidth={1.4} />
          </div>
          <div className="mt-4 text-base font-semibold">{t('common.noData')}</div>
        </div>
      ) : (
        <div className="space-y-3 px-4 pt-4">
          {rows.map((order) => (
            <article key={order.id} className="rounded-xl border border-line bg-bg p-4 shadow-[0_3px_14px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{order.strategyName ?? `#${order.strategyId}`}</div>
                <span className="rounded bg-bgSoft px-2 py-1 text-xs text-textSub">
                  {order.status === 1 ? t('finance.working') : t('finance.ended')}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-textSub">{t('finance.strategyAmount')}</span>
                <span className="num text-right">{Number(order.amount).toFixed(2)} USDT</span>
                <span className="text-textSub">{t('finance.strategyProfit')}</span>
                <span className="num text-right text-[#2F7D32]">
                  +{Number(order.liveProfit ?? order.totalProfit).toFixed(6)} USDT
                </span>
                <span className="text-textSub">{t('finance.strategyType')}</span>
                <span className="text-right">{order.strategyType ?? '-'}</span>
                <span className="text-textSub">{t('finance.createdAt')}</span>
                <span className="text-right text-xs">{new Date(order.startAt).toLocaleString()}</span>
              </div>
              {order.status === 1 && (
                <button onClick={() => stop(order)} className="mt-4 h-10 w-full rounded-full bg-text text-sm text-bg">
                  {t('finance.stopStrategy')}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="relative flex items-center justify-center">
      <span className={active ? 'font-medium text-text' : 'text-textSub'}>{children}</span>
      {active && <span className="absolute bottom-0 h-[2px] w-[170px] bg-text" />}
    </button>
  );
}
