import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/PageHeader';
import { toast } from '@/components/Toast';
import {
  fetchMyLockOrders,
  fetchMyAiOrders,
  fetchMyLoanOrders,
  fetchMyPortfolioOrders,
  redeemLock,
  repayLoan,
  redeemPortfolio,
  stopAiStrategy,
  type AiStrategyOrderVO,
  type LockOrderVO,
  type LoanOrderVO,
  type PortfolioOrderVO,
} from '@/api/finance';

const STATUS_LABEL: Record<number, string> = {
  1: 'finance.statusHolding',
  2: 'finance.statusRedeemed',
  3: 'finance.statusMatured',
};

export default function MyFinanceOrdersPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'lock' | 'portfolio' | 'loan' | 'ai'>('lock');
  const [lockRows, setLockRows] = useState<LockOrderVO[]>([]);
  const [pfRows, setPfRows] = useState<PortfolioOrderVO[]>([]);
  const [loanRows, setLoanRows] = useState<LoanOrderVO[]>([]);
  const [aiRows, setAiRows] = useState<AiStrategyOrderVO[]>([]);

  const reloadLock = () =>
    fetchMyLockOrders(undefined, 1, 30)
      .then((p) => setLockRows(p?.records ?? []))
      .catch(() => {});
  const reloadPf = () =>
    fetchMyPortfolioOrders(undefined, 1, 30)
      .then((p) => setPfRows(p?.records ?? []))
      .catch(() => {});
  const reloadLoan = () =>
    fetchMyLoanOrders(undefined, 1, 30)
      .then((p) => setLoanRows(p?.records ?? []))
      .catch(() => {});
  const reloadAi = () =>
    fetchMyAiOrders(undefined, 1, 30)
      .then((p) => setAiRows(p?.records ?? []))
      .catch(() => {});

  useEffect(() => {
    reloadLock();
    reloadPf();
    reloadLoan();
    reloadAi();
    const id = window.setInterval(() => {
      if (tab === 'lock') reloadLock();
      else if (tab === 'portfolio') reloadPf();
      else if (tab === 'loan') reloadLoan();
      else reloadAi();
    }, 5000);
    return () => window.clearInterval(id);
  }, [tab]);

  const onRedeemLock = async (o: LockOrderVO) => {
    if (!confirm(t('finance.confirmRedeem'))) return;
    try {
      await redeemLock(o.id);
      toast.success(t('finance.redeemSuccess'));
      reloadLock();
    } catch (e: any) {
      toast.error(e?.message ?? 'fail');
    }
  };
  const onRedeemPf = async (o: PortfolioOrderVO) => {
    if (!confirm(t('finance.confirmRedeem'))) return;
    try {
      await redeemPortfolio(o.id);
      toast.success(t('finance.redeemSuccess'));
      reloadPf();
    } catch (e: any) {
      toast.error(e?.message ?? 'fail');
    }
  };
  const onRepayLoan = async (o: LoanOrderVO) => {
    if (!confirm(t('finance.confirmRepay'))) return;
    try {
      await repayLoan(o.id);
      toast.success(t('finance.repaySuccess'));
      reloadLoan();
    } catch (e: any) {
      toast.error(e?.message ?? 'fail');
    }
  };
  const onStopAi = async (o: AiStrategyOrderVO) => {
    if (!confirm(t('finance.confirmStopAi'))) return;
    try {
      await stopAiStrategy(o.id);
      toast.success(t('finance.aiStopped'));
      reloadAi();
    } catch (e: any) {
      toast.error(e?.message ?? 'fail');
    }
  };

  return (
    <div className="pb-10">
      <PageHeader title={t('finance.myOrders')} fallbackPath="/finance" />
      <div className="flex gap-4 border-b border-line bg-bg px-4">
        {(['lock', 'portfolio', 'loan', 'ai'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 py-3 text-sm ${
              tab === k
                ? 'border-primary font-medium text-textMain'
                : 'border-transparent text-textSub'
            }`}
          >
            {k === 'lock' ? t('finance.tab.flexible') : k === 'portfolio' ? t('finance.tab.portfolio') : k === 'loan' ? t('finance.tab.loan') : 'AI'}
          </button>
        ))}
      </div>

      <div className="px-4 pt-3 space-y-2">
        {tab === 'lock' && lockRows.length === 0 && (
          <p className="py-8 text-center text-sm text-textSub">{t('common.noData')}</p>
        )}
        {tab === 'lock' &&
          lockRows.map((o) => {
            const apr = (Number(o.apr) * 100).toFixed(2);
            const fixed = o.lockType === 2;
            const matured =
              fixed && o.endAt && new Date(o.endAt).getTime() <= Date.now();
            const canRedeem =
              o.status === 1 && (!fixed || matured);
            return (
              <div
                key={o.id}
                className="rounded-lg border border-line bg-bgSoft p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{o.productName ?? `#${o.productId}`}</div>
                  <span className="rounded bg-bg px-2 py-0.5 text-textSub">
                    {t(STATUS_LABEL[o.status] ?? 'common.noData')}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-y-1 text-xs text-textSub">
                  <span>
                    {t('finance.amount')}:{' '}
                    <span className="font-mono text-textMain">
                      {Number(o.amount).toFixed(8)} {o.coin}
                    </span>
                  </span>
                  <span>
                    {t('finance.apr')}: <span className="font-mono text-up">{apr}%</span>
                  </span>
                  <span>
                    {t('finance.interest')}:{' '}
                    <span className="font-mono text-up">
                      +{Number(o.interest).toFixed(8)} {o.coin}
                    </span>
                  </span>
                  {o.endAt && (
                    <span>
                      {t('finance.endAt')}:{' '}
                      <span className="font-mono">
                        {new Date(o.endAt).toLocaleString()}
                      </span>
                    </span>
                  )}
                </div>
                {o.status === 1 && (
                  <div className="mt-2 flex justify-end">
                    <button
                      disabled={!canRedeem}
                      onClick={() => onRedeemLock(o)}
                      className="rounded border border-primary px-3 py-1 text-xs text-primary disabled:opacity-40"
                    >
                      {fixed && !matured ? t('finance.notMatured') : t('finance.redeem')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

        {tab === 'portfolio' && pfRows.length === 0 && (
          <p className="py-8 text-center text-sm text-textSub">{t('common.noData')}</p>
        )}
        {tab === 'portfolio' &&
          pfRows.map((o) => {
            const matured = o.endAt && new Date(o.endAt).getTime() <= Date.now();
            return (
              <div
                key={o.id}
                className="rounded-lg border border-line bg-bgSoft p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{o.productName ?? `#${o.productId}`}</div>
                  <span className="rounded bg-bg px-2 py-0.5 text-textSub">
                    {t(STATUS_LABEL[o.status] ?? 'common.noData')}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-y-1 text-xs text-textSub">
                  <span>
                    {t('finance.amount')}:{' '}
                    <span className="font-mono text-textMain">
                      {Number(o.amount).toFixed(2)} USDT
                    </span>
                  </span>
                  <span>
                    {t('finance.dailyRate')}:{' '}
                    <span className="font-mono text-up">
                      {(Number(o.dailyRate) * 100).toFixed(2)}%
                    </span>
                  </span>
                  <span>
                    {t('finance.interest')}:{' '}
                    <span className="font-mono text-up">
                      +{Number(o.totalProfit).toFixed(2)} USDT
                    </span>
                  </span>
                  {o.endAt && (
                    <span>
                      {t('finance.endAt')}:{' '}
                      <span className="font-mono">
                        {new Date(o.endAt).toLocaleString()}
                      </span>
                    </span>
                  )}
                </div>
                {o.status === 1 && (
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => onRedeemPf(o)}
                      className="rounded border border-primary px-3 py-1 text-xs text-primary"
                    >
                      {!matured ? t('finance.earlyRedeem') : t('finance.redeem')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        {tab === 'loan' && loanRows.length === 0 && (
          <p className="py-8 text-center text-sm text-textSub">{t('common.noData')}</p>
        )}
        {tab === 'loan' &&
          loanRows.map((o) => (
            <div
              key={o.id}
              className="rounded-lg border border-line bg-bgSoft p-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">DeFi {t('finance.tab.loan')} · {o.coin}</div>
                <span className="rounded bg-bg px-2 py-0.5 text-textSub">
                  {o.status === 1 ? t('finance.loanActive') : o.status === 2 ? t('finance.loanRepaid') : t('finance.loanLiquidated')}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-y-1 text-xs text-textSub">
                <span>
                  {t('finance.principal')}:{' '}
                  <span className="font-mono text-textMain">
                    {Number(o.borrowAmount).toFixed(8)} {o.coin}
                  </span>
                </span>
                <span>
                  {t('finance.collateral')}:{' '}
                  <span className="font-mono text-textMain">
                    {Number(o.collateralAmount).toFixed(2)} USDT
                  </span>
                </span>
                <span>
                  {t('finance.interest')}:{' '}
                  <span className="font-mono text-up">
                    +{Number(o.totalInterest).toFixed(8)} {o.coin}
                  </span>
                </span>
                <span>
                  {t('finance.dueAt')}:{' '}
                  <span className="font-mono">
                    {new Date(o.dueAt).toLocaleString()}
                  </span>
                </span>
              </div>
              {o.status === 1 && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => onRepayLoan(o)}
                    className="rounded border border-primary px-3 py-1 text-xs text-primary"
                  >
                    {t('finance.repay')} {Number(o.repayAmount ?? o.borrowAmount).toFixed(8)} {o.coin}
                  </button>
                </div>
              )}
            </div>
          ))}
        {tab === 'ai' && aiRows.length === 0 && (
          <p className="py-8 text-center text-sm text-textSub">{t('common.noData')}</p>
        )}
        {tab === 'ai' &&
          aiRows.map((o) => (
            <div
              key={o.id}
              className="rounded-lg border border-line bg-bgSoft p-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{o.strategyName ?? `#${o.strategyId}`}</div>
                <span className="rounded bg-bg px-2 py-0.5 text-textSub">
                  {o.status === 1 ? t('finance.running') : t('finance.ended')}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-y-1 text-xs text-textSub">
                <span>
                  {t('finance.invested')}:{' '}
                  <span className="font-mono text-textMain">
                    {Number(o.amount).toFixed(2)} USDT
                  </span>
                </span>
                <span>
                  {t('finance.strategyType')}: <span className="text-textMain">{o.strategyType ?? '-'}</span>
                </span>
                <span>
                  {t('finance.strategyProfit')}:{' '}
                  <span className="font-mono text-up">
                    +{Number(o.totalProfit).toFixed(6)} USDT
                  </span>
                </span>
                <span>
                  {t('finance.startedAt')}:{' '}
                  <span className="font-mono">
                    {new Date(o.startAt).toLocaleString()}
                  </span>
                </span>
              </div>
              {o.status === 1 && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => onStopAi(o)}
                    className="rounded border border-primary px-3 py-1 text-xs text-primary"
                  >
                    {t('finance.stopStrategy')}
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
