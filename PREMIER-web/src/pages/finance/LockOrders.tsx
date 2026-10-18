import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { fetchMyLockOrders, type LockOrderVO } from '@/api/finance';

const EMPTY_SRC = '/assets/lock-empty.png';

type TabKey = 'holding' | 'matured' | 'redeemed';

export default function LockOrdersPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [tab, setTab] = useState<TabKey>('holding');
  const [rows, setRows] = useState<LockOrderVO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMyLockOrders(undefined, 1, 100)
      .then((page) => {
        if (cancelled) return;
        setRows(page?.records ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (tab === 'holding') return rows.filter((item) => item.status === 1);
    if (tab === 'matured') return rows.filter((item) => item.status === 3);
    return rows.filter((item) => item.status === 2);
  }, [rows, tab]);

  const headers =
    tab === 'redeemed'
      ? [t('finance.recordCoin'), t('finance.recordDuration'), t('finance.recordYieldRate'), t('finance.recordRedeemedAmount')]
      : [t('finance.recordCoin'), t('finance.recordDuration'), t('finance.recordYieldRate'), t('finance.recordMaturedProfit')];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-white pb-6">
      <header className="sticky top-0 z-30 flex h-[58px] items-center justify-between border-b border-line bg-white px-4">
        <button type="button" onClick={() => nav('/finance/lock')} className="flex h-10 w-10 items-center justify-start" aria-label="back">
          <ChevronRight size={22} className="rotate-180" />
        </button>
        <div className="flex-1 text-center text-[18px] font-semibold text-black">{t('finance.purchaseRecords')}</div>
        <div className="w-10" />
      </header>

      <div className="px-4 pt-1.5">
        <div className="grid grid-cols-3 text-center text-[14px]">
          <TabButton active={tab === 'holding'} onClick={() => setTab('holding')}>
            {t('finance.running')}
          </TabButton>
          <TabButton active={tab === 'matured'} onClick={() => setTab('matured')}>
            {t('finance.completed')}
          </TabButton>
          <TabButton active={tab === 'redeemed'} onClick={() => setTab('redeemed')}>
            {t('finance.redeemed')}
          </TabButton>
        </div>

        <div className="mt-4 grid grid-cols-4 text-[10px] text-[#9AA0AF]">
          {headers.map((label) => (
            <div key={label} className="text-center">
              {label}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center text-[13px] text-[#8F8F8F]">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <img src={EMPTY_SRC} alt="empty" className="h-[72px] w-[72px] object-contain" />
            <div className="mt-3 text-[14px] font-medium text-black">{t('common.noData')}</div>
          </div>
        ) : (
          <div className="mt-3 space-y-2.5">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => nav(`/finance/lock/${item.productId}`)}
                className="grid w-full grid-cols-4 items-center rounded-[12px] border border-[#F1F1F1] bg-white px-2.5 py-3 text-center shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
              >
                <div>
                  <div className="text-[13px] font-semibold text-black">{item.coin}</div>
                  <div className="mt-1 text-[10px] text-[#9AA0AF]">{formatDate(item.createdAt)}</div>
                </div>
                <div className="text-[12px] text-black">{durationText(item, t)}</div>
                <div className="text-[12px] font-medium text-[#5C8A1D]">{formatApr(item.apr)}</div>
                <div className="text-[12px] font-medium text-black">{profitText(item, tab)}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative pb-3 pt-2.5 font-medium ${active ? 'text-black' : 'text-[#ABABAB]'}`}
    >
      {children}
      {active && <span className="absolute bottom-0 left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-black" />}
    </button>
  );
}

function durationText(item: LockOrderVO, t: (key: string) => string) {
  if (item.lockType === 1) return t('finance.flexible');
  if (item.lockDays) return `${item.lockDays}${t('finance.days')}`;
  return '--';
}

function formatApr(value: string | number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '--';
  return `${(num * 100).toFixed(2)}%`;
}

function profitText(item: LockOrderVO, tab: TabKey) {
  const coin = item.coin || 'USDT';
  if (tab === 'redeemed') {
    const total = Number(item.amount || 0) + Number(item.interest || 0);
    return `${trimAmount(total)} ${coin}`;
  }
  return `${trimAmount(item.liveInterest ?? item.interest ?? 0)} ${coin}`;
}

function trimAmount(value: string | number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '--';
  return num.toFixed(num >= 1 ? 2 : 6).replace(/0+$/, '').replace(/\.$/, '');
}

function formatDate(value?: string) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}
