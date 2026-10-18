import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Search, Square, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CoinLogo } from '@/components/AsterUI';
import { fetchLockProducts, type LockProduct } from '@/api/finance';
import { useCoinLogoMap } from '@/hooks/useCoinLogoMap';
import { useUserStore } from '@/store/userStore';

const BANNER_SRC = '/assets/lock-banner.png';

export default function LockListPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const token = useUserStore((s) => s.token);
  const { logoMap, loading: coinLogoLoading } = useCoinLogoMap();
  const [products, setProducts] = useState<LockProduct[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLockProducts()
      .then((rows) => {
        if (cancelled) return;
        setProducts(rows ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const list = [...products].sort((a, b) => {
      if ((b.isHot ?? 0) !== (a.isHot ?? 0)) return (b.isHot ?? 0) - (a.isHot ?? 0);
      if ((a.sort ?? a.id) !== (b.sort ?? b.id)) return (a.sort ?? a.id) - (b.sort ?? b.id);
      if ((a.lockType ?? 0) !== (b.lockType ?? 0)) return (a.lockType ?? 0) - (b.lockType ?? 0);
      return a.id - b.id;
    });
    if (!keyword) return list;
    return list.filter((item) => {
      const name = item.name.toLowerCase();
      const coin = item.coin.toLowerCase();
      return name.includes(keyword) || coin.includes(keyword);
    });
  }, [products, search]);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-white pb-8">
      <header className="sticky top-0 z-30 flex h-[58px] items-center justify-between border-b border-line bg-white px-4">
        <button type="button" onClick={() => nav(-1)} className="flex h-10 w-10 items-center justify-start" aria-label="back">
          <ChevronRight size={22} className="rotate-180" />
        </button>
        <div className="text-[18px] font-semibold text-black">{t('profile.lockEarn')}</div>
        <button
          type="button"
          onClick={() => (token ? nav('/finance/lock/orders') : nav('/auth/login?redirect=%2Ffinance%2Flock%2Forders'))}
          className="text-[14px] font-medium text-black"
        >
          {t('finance.records')}
        </button>
      </header>

      <main className="px-4 pb-7 pt-2">
        <section className="overflow-hidden rounded-[16px] bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[#F2F2F2] pb-4 pt-1">
            <div className="min-w-0 flex-1">
              <h1 className="text-[18px] font-semibold leading-[1.3] text-black">{t('finance.lockHeroTitle')}</h1>
              <p className="mt-1.5 text-[12px] leading-[18px] text-[#8F8F8F]">{t('finance.lockHeroDesc')}</p>
            </div>
            <img src={BANNER_SRC} alt="lock earn banner" className="h-[118px] w-[118px] shrink-0 object-contain" />
          </div>

          <div className="mt-4 flex h-[40px] items-center gap-2 rounded-full bg-[#F6F6F6] px-3.5">
            <Search size={16} className="text-[#999]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('finance.lockSearchPlaceholder')}
              className="h-full flex-1 bg-transparent text-[13px] text-black outline-none placeholder:text-[#B8B8B8]"
            />
          </div>
        </section>

        <section className="mt-4.5">
          <div className="mb-2.5 flex items-center gap-1.5 text-[16px] font-semibold text-black">
            <Square size={9} className="fill-black text-black" />
            <span>{t('finance.recommendedInvestments')}</span>
          </div>

          {loading ? (
            <div className="rounded-[16px] bg-[#F8F8F8] px-4 py-8 text-center text-[13px] text-[#8F8F8F]">
              {t('common.loading')}
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="rounded-[16px] bg-[#F8F8F8] px-4 py-8 text-center text-[13px] text-[#8F8F8F]">
              {t('common.noData')}
            </div>
          ) : (
            <div className="space-y-2.5">
              {visibleProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => nav(`/finance/lock/${product.id}`)}
                  className="flex w-full items-center gap-2.5 rounded-[14px] border border-[#F3F3F3] bg-white px-3.5 py-3.5 text-left shadow-[0_4px_14px_rgba(0,0,0,0.04)]"
                >
                  <CoinLogo coin={product.coin} logo={logoMap.get(product.coin.toUpperCase())} size={36} loading={coinLogoLoading} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold text-black">{product.name || product.coin}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                      <Badge active>{product.lockType === 1 ? t('finance.flexible') : `${product.lockDays}${t('finance.days')}`}</Badge>
                      {product.isHot === 1 && <Badge>{t('finance.hotTag')}</Badge>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[19px] font-semibold leading-none text-black">{aprRange(product)}</div>
                    <div className="mt-1 text-[10px] text-[#9A9A9A]">{t('finance.apr')}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Badge({
  children,
  active = false,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={`rounded-full px-2 py-[1px] text-[9px] font-medium ${
        active ? 'bg-[#0A0A0A] text-white' : 'bg-[#FFF2E8] text-[#F08A24]'
      }`}
    >
      {children}
    </span>
  );
}

function aprRange(product: LockProduct) {
  const min = formatPercent(product.aprMin);
  const max = formatPercent(product.aprMax);
  return min === max ? min : `${min}~${max}`;
}

function formatPercent(value: string | number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '--';
  const pct = (num * 100).toFixed(0);
  return `${pct}%`;
}
