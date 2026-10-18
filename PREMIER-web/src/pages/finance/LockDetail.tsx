import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Leaf, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { CoinLogo } from '@/components/AsterUI';
import { toast } from '@/components/Toast';
import { useWalletModal } from '@/hooks/useWalletModal';
import { fetchOverview, type AssetOverview } from '@/api/asset';
import { fetchLockProducts, subscribeLock, type LockProduct } from '@/api/finance';
import { useCoinLogoMap } from '@/hooks/useCoinLogoMap';
import { useUserStore } from '@/store/userStore';

export default function LockDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const nav = useNavigate();
  const token = useUserStore((s) => s.token);
  const { openWalletModal } = useWalletModal();
  const { logoMap, loading: coinLogoLoading } = useCoinLogoMap();
  const [product, setProduct] = useState<LockProduct | null>(null);
  const [overview, setOverview] = useState<AssetOverview | null>(null);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLockProducts()
      .then((rows) => {
        if (cancelled) return;
        const current = (rows ?? []).find((item) => String(item.id) === id);
        setProduct(current ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setProduct(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!token) return;
    fetchOverview().then(setOverview).catch(() => undefined);
  }, [token]);

  const available = useMemo(() => {
    if (!product || !overview) return 0;
    const account = overview.accounts.find((item) => item.accountType === 1 && item.coin === product.coin);
    return Number(account?.available ?? 0);
  }, [overview, product]);

  const amountNum = Number(amount || 0);
  const minAmount = Number(product?.minAmount ?? 0);
  const maxAmount = Number(product?.maxAmount ?? 0);

  const estimatedYield = useMemo(() => {
    if (!product || !amountNum || amountNum <= 0) return 0;
    const avgApr = (Number(product.aprMin) + Number(product.aprMax)) / 2;
    if (product.lockType === 1) {
      return (amountNum * avgApr) / 365;
    }
    return (amountNum * avgApr * Math.max(product.lockDays, 0)) / 365;
  }, [amountNum, product]);

  const averageApr = useMemo(() => {
    if (!product) return 0;
    return (Number(product.aprMin) + Number(product.aprMax)) / 2;
  }, [product]);

  const handleSubmit = async () => {
    if (!product) return;
    if (!token) {
      openWalletModal();
      return;
    }
    if (!amount || !Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error(t('finance.amountInvalid'));
      return;
    }
    if (minAmount > 0 && amountNum < minAmount) {
      toast.error(t('finance.amountMinError', { amount: trimFixed(minAmount), coin: product.coin }));
      return;
    }
    if (maxAmount > 0 && amountNum > maxAmount) {
      toast.error(t('finance.amountMaxError', { amount: trimFixed(maxAmount), coin: product.coin }));
      return;
    }
    if (amountNum > available) {
      toast.error(t('flash.insufficient'));
      return;
    }

    setSubmitting(true);
    try {
      await subscribeLock(product.id, amountNum);
      toast.success(t('finance.subscribeSuccess'));
      nav('/finance/lock/orders');
    } catch (error: any) {
      toast.error(error?.message ?? t('finance.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-white px-4 py-20 text-center text-[14px] text-[#8F8F8F]">
        {t('common.loading')}
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-white px-4 py-20 text-center text-[14px] text-[#8F8F8F]">
        {t('common.noData')}
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-white pb-8">
      <header className="sticky top-0 z-30 flex h-[58px] items-center justify-between border-b border-line bg-white px-4">
        <button type="button" onClick={() => nav('/finance/lock')} className="flex h-10 w-10 items-center justify-start" aria-label="back">
          <ChevronRight size={22} className="rotate-180" />
        </button>
        <div className="text-[18px] font-semibold text-black">{t('profile.lockEarn')}</div>
        <div className="w-10" />
      </header>

      <main className="px-4 pt-1.5">
        <section className="rounded-[16px] bg-white px-1.5 py-2.5">
          <div className="flex items-center gap-2.5 border-b border-[#ECECEC] pb-4">
            <CoinLogo coin={product.coin} logo={logoMap.get(product.coin.toUpperCase())} size={38} loading={coinLogoLoading} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-semibold text-black">{product.name}</div>
            </div>
            <div className="text-[13px] font-semibold text-[#5C8A1D]">{durationText(product, t)}</div>
          </div>

          <section className="border-b border-[#ECECEC] py-4">
            <div className="mb-2.5 text-[13px] font-medium text-black">{t('finance.chooseDuration')}</div>
            <button type="button" className="rounded-full bg-black px-5 py-2 text-[14px] font-semibold text-white">
              {durationText(product, t)}
            </button>
          </section>

          <section className="border-b border-[#ECECEC] py-4">
            <div className="mb-2.5 text-[13px] font-medium text-black">{t('finance.purchaseAmount')}</div>
            <div className="flex h-[40px] items-center rounded-full border border-[#DDDDDD] px-4">
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ''))}
                placeholder={t('finance.purchaseAmountPlaceholder')}
                inputMode="decimal"
                className="h-full flex-1 bg-transparent text-[15px] text-black outline-none placeholder:text-[13px] placeholder:text-[#C3C3C3]"
              />
              <button type="button" onClick={() => setAmount(trimFixed(available))} className="text-[13px] font-medium text-[#5C8A1D]">
                {t('asset.transferAll')}
              </button>
            </div>

            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="space-y-1.5 text-[12px]">
                <div className="text-[#7C8799]">
                  {t('finance.availableBalance')} <span className="font-medium text-black">{trimFixed(available)} {product.coin}</span>{' '}
                  <Leaf size={13} className="inline text-[#5C8A1D]" />
                </div>
                <div className="text-[#7C8799]">
                  {t('finance.serviceFee')} <span className="font-medium text-black">0 {product.coin}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => nav(`/assets/flash?fromCoin=USDT&toCoin=${encodeURIComponent(product.coin)}`)}
                className="flex items-center gap-1 text-[13px] font-medium text-[#5C8A1D]"
              >
                <Zap size={14} />
                {t('flash.title')}
              </button>
            </div>
          </section>

          <section className="py-4 text-[14px]">
            <DetailRow label={t('finance.tierYieldRate')} value={aprDisplay(product)} valueClass="text-[#5C8A1D]" />
            <DetailRow label={t('finance.interestDistribution')} value={product.lockType === 1 ? t('finance.dailyPayout') : t('finance.dailyPayout')} />
            <DetailRow label={t('finance.trustPrincipal')} value={t('finance.returnOnMaturity')} />
            <DetailRow
              label={t('finance.singleLimit')}
              value={`${trimFixed(minAmount)}-${maxAmount > 0 ? trimFixed(maxAmount) : '--'} ${product.coin}`}
            />
            <DetailRow
              label={t('finance.estimatedIncome')}
              value={`${trimFixed(estimatedYield)} ${product.coin}`}
            />
          </section>
        </section>

        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="mt-8 flex h-[48px] w-full items-center justify-center rounded-full bg-black text-[16px] font-semibold text-white disabled:opacity-60"
        >
          {token ? t('nft.buyNow') : t('auth.login')}
        </button>

        {amountNum > 0 && averageApr > 0 && (
          <p className="mt-3 text-center text-[11px] text-[#8F8F8F]">
            {t('finance.estimatedDailyHint', { amount: trimFixed((amountNum * averageApr) / 365), coin: product.coin })}
          </p>
        )}
      </main>
    </div>
  );
}

function DetailRow({
  label,
  value,
  valueClass = 'text-black',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <div className="text-[13px] text-[#596273]">{label}</div>
      <div className={`text-right text-[13px] font-medium ${valueClass}`}>{value}</div>
    </div>
  );
}

function durationText(product: LockProduct, t: (key: string) => string) {
  return product.lockType === 1 ? t('finance.flexible') : `${product.lockDays}${t('finance.days')}`;
}

function aprDisplay(product: LockProduct) {
  const min = percent(product.aprMin);
  const max = percent(product.aprMax);
  return min === max ? min : `${min}~${max}`;
}

function percent(value: string | number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '--';
  return `${trimFixed(num * 100)}%`;
}

function trimFixed(value: string | number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  if (num === 0) return '0';
  const precision = num >= 1000 ? 0 : num >= 1 ? 2 : 6;
  return num.toFixed(precision).replace(/0+$/, '').replace(/\.$/, '');
}
