import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { fetchOverview, type AssetOverview } from '@/api/asset';
import { fetchTicks } from '@/api/quote';
import { fetchPortfolioProducts, type PortfolioProduct } from '@/api/finance';
import { CoinLogo } from '@/components/AsterUI';
import {
  CoinBubble,
  PortfolioChart,
  PortfolioHeader,
  portfolioDailyPct,
  splitCoins,
  getPortfolioDisplayName,
} from './portfolioShared';
import { useResponsive } from '@/hooks/useResponsive';
import { PcContainer } from '@/components/pc';
import { useCoinLogoMap } from '@/hooks/useCoinLogoMap';

const TICKERS = [
  { coin: 'BTC', symbol: 'BTCUSDT' },
  { coin: 'ETH', symbol: 'ETHUSDT' },
  { coin: 'ATOM', symbol: 'ATOMUSDT' },
];

export default function PortfolioListPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { isPc } = useResponsive();
  const { logoMap: coinLogoMap, loading: coinLogoLoading } = useCoinLogoMap();
  const [products, setProducts] = useState<PortfolioProduct[]>([]);
  const [overview, setOverview] = useState<AssetOverview | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPortfolioProducts().then((rows) => setProducts(rows ?? [])).catch(() => setProducts([]));
    fetchOverview().then(setOverview).catch(() => {});
    fetchTicks(TICKERS.map((item) => item.symbol))
      .then((ticks) => {
        const next: Record<string, string> = {};
        ticks?.forEach((tick) => {
          next[tick.symbol] = tick.price;
        });
        setPrices(next);
      })
      .catch(() => {});
  }, []);

  const financeUsdt = useMemo(() => {
    const byCoin = overview?.accounts.find((item) => item.accountType === 3 && item.coin === 'USDT')?.available;
    return byCoin ?? overview?.financeTotalUsd ?? '0';
  }, [overview]);

  if (isPc) {
    return (
      <div className="bg-bg py-12 text-text">
        <PcContainer>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="pc-h1 m-0">{t('discover.portfolio')}</h1>
              <p className="mt-3 text-[18px] text-textMute">{t('discover.portfolioDesc')}</p>
            </div>
            <button onClick={() => nav('/finance/portfolio/orders')} className="pc-btn-ghost">
              {t('finance.tradingOrders')}
            </button>
          </div>

          <div className="mt-10 rounded-lg border border-line bg-bg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CoinLogo coin="USDT" logo={coinLogoMap.get('USDT')} size={68} loading={coinLogoLoading} />
                <div>
                  <div className="text-[16px] font-medium text-text">USDT</div>
                  <div className="num pc-price mt-1 text-[32px] font-semibold text-text">{Number(financeUsdt).toFixed(2)}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-8">
                {TICKERS.map((item) => (
                  <div key={item.coin} className="text-right">
                    <div className="text-[13px] text-textSubPc">{item.coin}/USDT</div>
                    <div className="num pc-price mt-1 text-[20px] font-semibold text-text">{formatPrice(prices[item.symbol])}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-6">
            {products.map((product) => (
              <PcPortfolioCard
                key={product.id}
                product={product}
                logoMap={coinLogoMap}
                coinLogoLoading={coinLogoLoading}
                onClick={() => nav(`/finance/portfolio/${product.id}`)}
              />
            ))}
          </div>
        </PcContainer>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-white pb-24">
      <PortfolioHeader
        onBack={() => nav('/discover')}
        right={<button onClick={() => nav('/finance/portfolio/orders')} className="text-[12px] font-medium">{t('finance.tradingOrders')}</button>}
      />

      <main className="px-4 pt-4">
        <section className="flex items-center gap-3 px-1">
          <div className="rounded-full shadow-[inset_0_0_0_6px_rgba(255,255,255,0.16)]">
            <CoinLogo coin="USDT" logo={coinLogoMap.get('USDT')} size={68} loading={coinLogoLoading} />
          </div>
          <div>
            <div className="text-[15px] font-medium">USDT</div>
            <div className="mt-1 flex items-center gap-2.5">
              <span className="num text-[22px] font-semibold">{Number(financeUsdt).toFixed(2)}</span>
              <span className="rounded-full bg-[#F04472] px-2 py-1 text-[10px] font-medium text-white">{t('finance.totalYield')}</span>
            </div>
          </div>
        </section>

        <section className="mt-7 grid grid-cols-3">
          {TICKERS.map((item) => (
            <div key={item.coin} className="text-left">
              <div className="text-[12px] font-medium">{item.coin}</div>
              <div className="mt-1 flex items-center gap-1">
                <CoinBubble coin={item.coin} logo={coinLogoMap.get(item.coin)} size={16} loading={coinLogoLoading} />
                <span className="num text-[16px] font-semibold">{formatPrice(prices[item.symbol])}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-10 space-y-5">
          {products.map((product) => (
            <PortfolioCard
              key={product.id}
              product={product}
              logoMap={coinLogoMap}
              coinLogoLoading={coinLogoLoading}
              onClick={() => nav(`/finance/portfolio/${product.id}`)}
            />
          ))}
        </section>
      </main>
    </div>
  );
}

function PortfolioCard({
  product,
  logoMap,
  coinLogoLoading,
  onClick,
}: {
  product: PortfolioProduct;
  logoMap: Map<string, string | null>;
  coinLogoLoading: boolean;
  onClick: () => void;
}) {
  const { t, i18n } = useTranslation();
  const coins = splitCoins(product);
  return (
    <article className="relative overflow-hidden rounded-xl bg-white shadow-[0_3px_16px_rgba(0,0,0,0.08)]">
      {product.isHot === 1 && (
        <div className="absolute right-0 top-0 z-10 rounded-bl-2xl bg-[#FF4D16] px-7 py-2 text-[12px] font-semibold text-white">
          HOT
        </div>
      )}
      <div className="px-4 pb-3 pt-7">
        <div className="mb-3 flex items-center gap-2">
          {coins.slice(0, 3).map((coin) => (
            <span key={coin} className="inline-flex rounded-full ring-2 ring-bg">
              <CoinBubble coin={coin} logo={logoMap.get(coin.toUpperCase())} size={26} loading={coinLogoLoading} />
            </span>
          ))}
        </div>
        <h2 className="text-[19px] font-medium">{getPortfolioDisplayName(product.name, i18n.language, t)}</h2>
        <div className="mt-2.5 text-[13px] font-normal text-textSub">
          {t('finance.investAmount')}:{Number(product.minAmount).toFixed(0)}-{Number(product.maxAmount).toFixed(0)}
          <span className="text-[#2F7D32]">T</span>
        </div>
      </div>
      <div className="h-[180px]">
        <PortfolioChart seed={product.id} height={180} />
      </div>
      <div className="-mt-[62px] px-4 pb-4">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-[11px] font-medium text-[#2F7D32]">
            {t('finance.yieldRate')}
            <span className="rounded-full bg-[#E9446A] px-2 py-1 text-[10px] font-medium text-white">
              {t('finance.durationLabel')}: {product.durationDays}{t('finance.days')}
            </span>
          </div>
          <div className="num mt-2 text-[22px] font-semibold">{portfolioDailyPct(product)}% {t('finance.perDay')}</div>
          <button onClick={onClick} className="mt-4 flex h-[46px] w-full items-center justify-center gap-2 rounded-full bg-text text-[14px] font-medium text-bg">
            <Plus size={18} />
            {t('finance.joinUse')}
          </button>
        </div>
      </div>
    </article>
  );
}

function formatPrice(value?: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '--';
  if (n >= 1000) return n.toFixed(2);
  if (n >= 100) return n.toFixed(0);
  return n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

function PcPortfolioCard({
  product,
  logoMap,
  coinLogoLoading,
  onClick,
}: {
  product: PortfolioProduct;
  logoMap: Map<string, string | null>;
  coinLogoLoading: boolean;
  onClick: () => void;
}) {
  const { t, i18n } = useTranslation();
  const coins = splitCoins(product);
  return (
    <article className="relative overflow-hidden rounded-lg border border-line bg-bg shadow-pcCard transition hover:-translate-y-0.5">
      {product.isHot === 1 && (
        <div className="absolute right-3 top-3 z-10 rounded bg-down px-3 py-1 text-[12px] font-bold text-white">HOT</div>
      )}
      <div className="px-5 pb-3 pt-6">
        <div className="mb-4 flex items-center gap-2">
          {coins.slice(0, 3).map((coin) => (
            <span key={coin} className="inline-flex rounded-full ring-2 ring-bg">
              <CoinBubble coin={coin} logo={logoMap.get(coin.toUpperCase())} size={34} loading={coinLogoLoading} />
            </span>
          ))}
        </div>
        <h2 className="text-[20px] font-semibold text-text">{getPortfolioDisplayName(product.name, i18n.language, t)}</h2>
        <div className="mt-2 text-[13px] text-textSubPc">
          {t('finance.investAmount')}: {Number(product.minAmount).toLocaleString()} ~ {Number(product.maxAmount).toLocaleString()} USDT
        </div>
      </div>
      <div className="h-[160px]">
        <PortfolioChart seed={product.id} />
      </div>
      <div className="px-5 pb-5">
        <div className="flex items-center gap-2 text-[13px] text-primary">
          {t('finance.yieldRate')}
          <span className="rounded bg-bgSection px-2 py-0.5 text-[12px] text-textSubPc">
            {t('finance.durationLabel')}: {product.durationDays} {t('finance.days')}
          </span>
        </div>
        <div className="num pc-price mt-2 text-[26px] font-semibold text-text">{portfolioDailyPct(product)}% <span className="text-[14px] font-normal text-textSubPc">/ {t('finance.perDay')}</span></div>
        <button onClick={onClick} className="pc-btn-dark mt-4 w-full">
          <Plus size={16} className="mr-1" />
          {t('finance.joinUse')}
        </button>
      </div>
    </article>
  );
}
