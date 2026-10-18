import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { fetchOverview, type AssetOverview } from '@/api/asset';
import { fetchPortfolioProducts, subscribePortfolio, type PortfolioProduct } from '@/api/finance';
import { fetchTicks } from '@/api/quote';
import { CoinLogo } from '@/components/AsterUI';
import { toast } from '@/components/Toast';
import {
  CoinBubble,
  PortfolioChart,
  PortfolioHeader,
  SectionTitle,
  portfolioDailyPct,
  splitCoins,
  getPortfolioDisplayName,
} from './portfolioShared';
import { useCoinLogoMap } from '@/hooks/useCoinLogoMap';

export default function PortfolioProductDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const nav = useNavigate();
  const { logoMap: coinLogoMap, loading: coinLogoLoading } = useCoinLogoMap();
  const [product, setProduct] = useState<PortfolioProduct | null>(null);
  const [overview, setOverview] = useState<AssetOverview | null>(null);
  const [amount, setAmount] = useState('');
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPortfolioProducts()
      .then((rows) => {
        const found = (rows ?? []).find((item) => String(item.id) === id) ?? null;
        setProduct(found);
        const symbols = found ? splitCoins(found).map((coin) => `${coin}USDT`) : [];
        if (symbols.length) {
          fetchTicks(symbols)
            .then((ticks) => {
              const next: Record<string, string> = {};
              ticks?.forEach((tick) => {
                next[tick.symbol.replace('USDT', '')] = tick.change;
              });
              setChanges(next);
            })
            .catch(() => {});
        }
      })
      .catch(() => setProduct(null));
    fetchOverview().then(setOverview).catch(() => {});
  }, [id]);

  const available = useMemo(() => {
    return overview?.accounts.find((item) => item.accountType === 1 && item.coin === 'USDT')?.available ?? '0';
  }, [overview]);

  const estimated = useMemo(() => {
    if (!product || !amount) return 0;
    return Number(amount) * Number(product.dailyRate) * product.durationDays;
  }, [amount, product]);

  const submit = async () => {
    if (!product) return;
    if (!amount || Number(amount) <= 0) {
      toast.error(t('finance.enterInvestAmount'));
      return;
    }
    setLoading(true);
    try {
      await subscribePortfolio(product.id, amount);
      toast.success(t('finance.subscribeSuccess'));
      nav('/finance/portfolio/orders');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('finance.submitFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!product) {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-white">
        <PortfolioHeader onBack={() => nav('/finance/portfolio')} />
        <p className="pt-10 text-center text-sm text-textSub">{t('common.loading')}</p>
      </div>
    );
  }

  const coins = splitCoins(product);

  return (
    <div className="mx-auto min-h-screen max-w-md overflow-x-hidden bg-white">
      <PortfolioHeader title={getPortfolioDisplayName(product.name, i18n.language, t)} onBack={() => nav('/finance/portfolio')} />

      <section className="bg-white px-4 pb-6 pt-4">
        <SectionTitle>{t('finance.subscribePortfolio')}</SectionTitle>
        <div className="mt-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-center gap-2.5 pr-4">
            {coins.map((coin, index) => (
              <div key={coin} className="flex items-center gap-2.5">
                {index > 0 && <span className="text-[24px] font-medium text-textSub">+</span>}
                <CoinCard coin={coin} logo={coinLogoMap.get(coin.toUpperCase())} change={changes[coin]} loading={coinLogoLoading} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-2.5 text-[13px] font-medium">
          <InfoRow label={t('aiFinance.runTime')} value={`${product.durationDays}${t('finance.days')}`} />
          <InfoRow label={t('finance.yieldRate')} value={`${portfolioDailyPct(product)}%`} />
          <InfoRow label={t('finance.estTotal')} value={`${estimated.toFixed(2)}-${estimated.toFixed(2)} T`} />
          <InfoRow
            label={t('finance.investAmount')}
            value={`${Number(product.minAmount).toFixed(0)}-${Number(product.maxAmount).toFixed(0)} T`}
          />
          <InfoRow label={t('trade.fee')} value="0 T" />
        </div>
      </section>

      <section className="border-t border-line bg-white px-4 pb-7 pt-4">
        <SectionTitle>{t('finance.subscribeAmountLabel')}</SectionTitle>
        <div className="mt-5 text-center">
          <div className="text-[18px] font-semibold">{t('finance.estimatedSubscribeAmount')}</div>
          <div className="mt-1.5 text-[12px] text-textSub">
            {t('finance.accountBalance')}:
            <span className="num ml-1 text-text">{Number(available).toFixed(0)}</span>
            <span className="text-[#2F7D32]"> T</span>
          </div>
        </div>

        <div className="mx-3 mt-5 flex h-[58px] items-center rounded-xl border border-line bg-white px-2.5">
          <button onClick={() => setAmount('')} className="flex h-9 w-9 items-center justify-center rounded-lg bg-text text-bg">
            <Minus size={18} />
          </button>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder={t('finance.enterInvestAmount')}
            className="mx-3 min-w-0 flex-1 bg-transparent text-[14px] font-normal outline-none placeholder:text-[13px] placeholder:text-textSub"
          />
          <span className="mr-3 text-[16px] font-medium text-[#2F7D32]">T</span>
          <button onClick={() => setAmount(available)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-text text-bg">
            <Plus size={18} />
          </button>
        </div>

        <button
          disabled={loading}
          onClick={submit}
          className="mx-3 mt-6 h-[48px] w-[calc(100%-1.5rem)] rounded-full bg-text text-[14px] font-medium text-bg disabled:opacity-60"
        >
          {t('finance.subscribe')}
        </button>
      </section>

      <section className="border-t border-line px-4 py-6">
        <SectionTitle>{t('finance.howItWorks')}</SectionTitle>
        <p className="mt-4 text-[13px] leading-7 text-textSub">
          {t('finance.portfolioWorkDesc')}
        </p>
      </section>
    </div>
  );
}

function CoinCard({
  coin,
  logo,
  change,
  loading = false,
}: {
  coin: string;
  logo?: string | null;
  change?: string;
  loading?: boolean;
}) {
  const value = Number(change ?? '-0.018164');
  return (
    <div className="w-[132px] shrink-0 overflow-hidden rounded-[14px] border border-line bg-white">
      <div className="px-3 pb-2 pt-3">
        {logo || loading ? <CoinLogo coin={coin} logo={logo} size={40} loading={loading && !logo} /> : <CoinBubble coin={coin} size={40} />}
        <div className="mt-3 text-[14px] font-medium">{coin}</div>
        <div className="num mt-1 text-[12px] font-medium text-[#C95070]">{(value * 100).toFixed(4)}%</div>
      </div>
      <div className="h-[78px]">
        <PortfolioChart seed={coin.charCodeAt(0) + coin.length} height={78} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-textSub">{label}</span>
      <span className="num text-[13px] font-medium text-text">{value}</span>
    </div>
  );
}
