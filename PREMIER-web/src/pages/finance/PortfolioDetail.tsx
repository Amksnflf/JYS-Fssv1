import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { toast } from '@/components/Toast';
import { fetchOverview, type AssetOverview } from '@/api/asset';
import {
  fetchPortfolioProducts,
  subscribePortfolio,
  type PortfolioProduct,
} from '@/api/finance';
import { getPortfolioDisplayName } from './portfolioShared';

export default function PortfolioDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const nav = useNavigate();
  const [product, setProduct] = useState<PortfolioProduct | null>(null);
  const [overview, setOverview] = useState<AssetOverview | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPortfolioProducts().then((d) => {
      const p = (d ?? []).find((x) => String(x.id) === id);
      setProduct(p ?? null);
    });
    fetchOverview().then(setOverview).catch(() => {});
  }, [id]);

  const available = useMemo(() => {
    if (!overview) return '0';
    return (
      overview.accounts.find((a) => a.accountType === 1 && a.coin === 'USDT')?.available ??
      '0'
    );
  }, [overview]);

  const totalProfit = useMemo(() => {
    const a = Number(amount);
    if (!product || !a) return 0;
    return a * Number(product.dailyRate) * product.durationDays;
  }, [amount, product]);

  const submit = async () => {
    if (!product) return;
    if (!amount || Number(amount) <= 0) {
      toast.error(t('finance.amountInvalid'));
      return;
    }
    setLoading(true);
    try {
      await subscribePortfolio(product.id, amount);
      toast.success(t('finance.subscribeSuccess'));
      nav('/finance/orders');
    } catch (e: any) {
      toast.error(e?.message ?? 'fail');
    } finally {
      setLoading(false);
    }
  };

  if (!product) {
    return (
      <div>
        <PageHeader title={t('finance.detail')} fallbackPath="/finance" />
        <p className="px-4 pt-8 text-center text-sm text-textSub">{t('common.loading')}</p>
      </div>
    );
  }

  const dailyPct = (Number(product.dailyRate) * 100).toFixed(2);
  const totalPct = (Number(product.dailyRate) * product.durationDays * 100).toFixed(2);

  return (
    <div className="pb-24">
      <PageHeader title={getPortfolioDisplayName(product.name, i18n.language, t)} fallbackPath="/finance" />
      <div className="mx-auto max-w-md px-4 pt-4 md:max-w-[640px]">
        <div className="rounded-2xl bg-bgSoft p-5 text-center">
          <div className="text-xs text-textSub">{t('finance.totalRate')}</div>
          <div className="mt-1 font-mono text-3xl font-semibold text-up">{totalPct}%</div>
          <div className="mt-1 text-xs text-textSub">
            {product.coins} · {product.durationDays} {t('finance.days')}
          </div>
        </div>

        <div className="mt-4 space-y-2 rounded-xl border border-line p-4 text-xs">
          <Row label={t('finance.dailyRate')}>{dailyPct}%</Row>
          <Row label={t('finance.duration')}>
            {product.durationDays} {t('finance.days')}
          </Row>
          <Row label={t('finance.minAmount')}>
            {Number(product.minAmount).toFixed(2)} USDT
          </Row>
          {Number(product.maxAmount) > 0 && (
            <Row label={t('finance.maxAmount')}>
              {Number(product.maxAmount).toFixed(2)} USDT
            </Row>
          )}
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-xs text-textSub">
            <span>{t('finance.subscribeAmount')} (USDT)</span>
            <span>
              {t('asset.available')} {Number(available).toFixed(2)} USDT
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-bgSoft px-3">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              className="h-11 flex-1 bg-transparent font-mono text-base outline-none"
            />
            <button
              onClick={() => setAmount(available)}
              className="text-xs font-medium text-primary"
            >
              {t('finance.max')}
            </button>
          </div>
          {totalProfit > 0 && (
            <p className="mt-2 text-xs text-textSub">
              {t('finance.estTotal')}:{' '}
              <span className="font-mono text-up">+{totalProfit.toFixed(2)} USDT</span>
            </p>
          )}
        </div>

        <button
          disabled={loading}
          onClick={submit}
          className="btn-primary mt-8 w-full disabled:opacity-50"
        >
          {t('finance.subscribe')}
        </button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-textSub">{label}</span>
      <span className="font-mono">{children}</span>
    </div>
  );
}
