import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSearch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  fetchMyPortfolioOrders,
  redeemPortfolio,
  type PortfolioOrderVO,
} from '@/api/finance';
import { toast } from '@/components/Toast';
import { PortfolioHeader } from './portfolioShared';

type TabKey = 'running' | 'done';

export default function PortfolioOrdersPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [tab, setTab] = useState<TabKey>('running');
  const [rows, setRows] = useState<PortfolioOrderVO[]>([]);

  const reload = () => {
    const status = tab === 'running' ? 1 : undefined;
    fetchMyPortfolioOrders(status, 1, 30)
      .then((page) => {
        const records = page?.records ?? [];
        setRows(tab === 'done' ? records.filter((item) => item.status !== 1) : records);
      })
      .catch(() => setRows([]));
  };

  useEffect(() => {
    reload();
    const timer = window.setInterval(reload, 5000);
    return () => window.clearInterval(timer);
  }, [tab]);

  const redeem = async (order: PortfolioOrderVO) => {
    if (!window.confirm(t('finance.confirmRedeemPortfolio'))) return;
    try {
      await redeemPortfolio(order.id);
      toast.success(t('finance.redeemed'));
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('finance.operationFailed'));
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-bg">
      <PortfolioHeader title={t('finance.portfolioOrders')} onBack={() => nav('/finance/portfolio')} />

      <div className="grid h-[74px] grid-cols-2 border-b border-line text-base">
        <TabButton active={tab === 'running'} onClick={() => setTab('running')}>
          {t('finance.running')}
        </TabButton>
        <TabButton active={tab === 'done'} onClick={() => setTab('done')}>
          {t('finance.completed')}
        </TabButton>
      </div>

      {rows.length === 0 ? (
        <div className="pt-16 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center">
            <FileSearch size={58} strokeWidth={1.4} />
          </div>
          <div className="mt-4 text-base font-bold">{t('common.noData')}</div>
        </div>
      ) : (
        <div className="space-y-3 px-4 pt-4">
          {rows.map((order) => (
            <article key={order.id} className="rounded-xl border border-line p-4 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-bold">{order.productName ?? `#${order.productId}`}</div>
                <span className="rounded bg-bgSoft px-2 py-1 text-xs text-textSub">
                  {order.status === 1 ? t('finance.running') : t('finance.completed')}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-y-2">
                <OrderRow label={t('finance.subscribeAmountLabel')} value={`${Number(order.amount).toFixed(2)} USDT`} />
                <OrderRow label={t('finance.interest')} value={`+${Number(order.liveProfit ?? order.totalProfit).toFixed(6)} USDT`} />
                <OrderRow label={t('finance.yieldRate')} value={`${(Number(order.dailyRate) * 100).toFixed(2)}% ${t('finance.perDay')}`} />
                <OrderRow label={t('aiFinance.runTime')} value={`${order.durationDays ?? '-'}${t('finance.days')}`} />
              </div>
              {order.status === 1 && (
                <button onClick={() => redeem(order)} className="mt-4 h-10 w-full rounded-full bg-text text-sm text-bg">
                  {t('finance.redeem')}
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

function OrderRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-textSub">{label}</span>
      <span className="num text-right">{value}</span>
    </>
  );
}
