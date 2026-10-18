import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/PageHeader';
import { fetchBillPage, type AccountLog } from '@/api/asset';
import { useResponsive } from '@/hooks/useResponsive';
import { PcAssetEmpty, PcAssetLayout } from './PcAssetLayout';

const BIZ_TYPES = [
  '',
  'deposit',
  'withdraw',
  'transfer',
  'spot',
  'perp',
  'option',
  'flash',
  'lock',
  'loan',
  'admin_adjust',
];

export default function BillPage() {
  const { t } = useTranslation();
  const { isPc } = useResponsive();
  const [bizType, setBizType] = useState('');
  const [list, setList] = useState<AccountLog[]>([]);
  const [pageNo, setPageNo] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const load = (p: number, type: string) => {
    setLoading(true);
    fetchBillPage({ pageNo: p, pageSize: 20, bizType: type || undefined })
      .then((d) => {
        const records = d?.records ?? [];
        setList((prev) => (p === 1 ? records : [...prev, ...records]));
        setHasMore(records.length >= 20);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPageNo(1);
    load(1, bizType);
  }, [bizType]);

  if (isPc) {
    return (
      <PcAssetLayout active="orders">
        <section className="w-full">
          <div className="flex items-center gap-[12px] rounded-[14px] border border-lineSolid bg-white p-[6px] text-[13px] font-semibold shadow-[0_10px_24px_rgba(4,3,3,0.04)]">
            {BIZ_TYPES.slice(0, 7).map((b) => (
              <button
                key={b || 'all'}
                onClick={() => setBizType(b)}
                className={`h-[30px] rounded-[9px] px-[14px] transition ${
                  bizType === b ? 'bg-text text-white shadow-[0_4px_10px_rgba(4,3,3,0.12)]' : 'text-textSubPc hover:bg-bgSoft hover:text-text'
                }`}
              >
                {b ? t(`asset.bizType.${b}`) : t('asset.depositRecord')}
              </button>
            ))}
          </div>
          <div className="mt-[36px] flex justify-end text-[12px] text-text">
            {t('asset.recordsCount', { count: list.length })}
          </div>
          <div className="mt-[22px] grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr_1fr] px-[16px] text-[12px] font-semibold text-textSubPc">
            <span>{t('asset.occurrenceTime')}</span>
            <span>{t('asset.coin')}</span>
            <span>{t('asset.depositType')}</span>
            <span>{t('asset.quantity')}</span>
            <span>{t('asset.fee')}</span>
            <span className="text-right">{t('asset.status')}</span>
          </div>
          {list.length === 0 && !loading ? (
            <PcAssetEmpty label={t('common.noData')} />
          ) : (
            <div className="mt-[12px] overflow-hidden rounded-[14px] border border-lineSolid bg-white shadow-[0_10px_24px_rgba(4,3,3,0.04)]">
              {list.map((it) => {
                const positive = Number(it.amount) >= 0;
                return (
                  <div key={it.id} className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr_1fr] border-b border-line px-[16px] py-[14px] text-[12px] last:border-b-0">
                    <span className="text-textSubPc">{it.createdAt}</span>
                    <span className="font-semibold text-text">{it.coin}</span>
                    <span className="font-medium text-text">{t(`asset.bizType.${it.bizType}`, it.bizType)}</span>
                    <span className={`num pc-price font-semibold ${positive ? 'text-up' : 'text-down'}`}>{positive ? '+' : ''}{it.amount}</span>
                    <span className="num pc-price">0</span>
                    <span className="text-right font-medium text-textSubPc">{t('asset.completed')}</span>
                  </div>
                );
              })}
            </div>
          )}
          {hasMore && list.length > 0 && (
            <button
              disabled={loading}
              onClick={() => {
                const next = pageNo + 1;
                setPageNo(next);
                load(next, bizType);
              }}
              className="mt-[18px] h-[34px] w-full rounded-[17px] border border-line bg-white text-[12px] font-semibold text-textSubPc hover:border-text hover:text-text"
            >
              {loading ? t('common.loading') : t('common.more')}
            </button>
          )}
        </section>
      </PcAssetLayout>
    );
  }

  return (
    <div className="pb-8">
      <PageHeader title={t('asset.billTitle')} fallbackPath="/assets" />
      <div className="px-4 pt-3 md:px-6 md:max-w-[800px] md:mx-auto">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {BIZ_TYPES.map((b) => (
            <button
              key={b || 'all'}
              onClick={() => setBizType(b)}
              className={`h-8 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition active:scale-[0.98] ${
                bizType === b
                  ? 'border-text bg-text text-white shadow-[0_6px_14px_rgba(4,3,3,0.14)]'
                  : 'border-lineSolid bg-white text-textSub shadow-[0_2px_8px_rgba(4,3,3,0.04)]'
              }`}
            >
              {b ? t(`asset.bizType.${b}`) : t('common.more')}
            </button>
          ))}
        </div>

        {list.length === 0 && !loading ? (
          <div className="py-12 text-center text-sm text-textSub">{t('common.noData')}</div>
        ) : (
          <ul className="mt-2 space-y-2">
            {list.map((it) => {
              const positive = Number(it.amount) >= 0;
              return (
                <li
                  key={it.id}
                  className="grid grid-cols-12 items-center rounded-2xl border border-lineSolid bg-white px-4 py-3 shadow-[0_8px_20px_rgba(4,3,3,0.045)]"
                >
                  <div className="col-span-7">
                    <div className="flex min-w-0 items-center gap-1.5 text-sm font-black tracking-[-0.01em]">
                      <span className="truncate">{t(`asset.bizType.${it.bizType}`, it.bizType)}</span>
                      <span className="rounded-full border border-lineSolid px-1.5 py-0.5 text-[10px] font-bold leading-none text-textSub">{it.coin}</span>
                    </div>
                    <div className="mt-1 text-[11px] font-medium text-textSub">{it.createdAt}</div>
                  </div>
                  <div className="col-span-5 text-right">
                    <div className={`num text-base font-black tracking-[-0.01em] ${positive ? 'text-up' : 'text-down'}`}>
                      {positive ? '+' : ''}
                      {it.amount}
                    </div>
                    <div className="num mt-1 text-[11px] font-medium text-textSub">
                      {t('asset.available')} {it.balanceAfter}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {hasMore && list.length > 0 && (
          <button
            disabled={loading}
            onClick={() => {
              const next = pageNo + 1;
              setPageNo(next);
              load(next, bizType);
            }}
            className="mt-4 h-10 w-full rounded-full border border-lineSolid bg-white text-xs font-semibold text-textSub shadow-[0_4px_12px_rgba(4,3,3,0.04)]"
          >
            {loading ? t('common.loading') : t('common.more')}
          </button>
        )}
      </div>
    </div>
  );
}
