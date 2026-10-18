import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { type SymbolRow } from '@/api/quote';
import { subscribeQuote, type WsTick } from '@/api/quoteWS';
import { AsterSearchBar, BottomSheet, EmptyState, PairCoinIcon } from '@/components/AsterUI';
import { SymbolBadges } from '@/components/SymbolBadges';
import { formatChangePercent, parseFiniteNumber } from '@/utils/number';
import { useResponsive } from '@/hooks/useResponsive';
import { useFavoriteSymbols } from '@/hooks/useFavoriteSymbols';
import { useMarketStore } from '@/store/marketStore';
import { toast } from '@/components/Toast';
import { buildKlinePath, buildTradePagePath, isViewOnlySpot } from '@/utils/market';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (row: SymbolRow) => void;
  tradeType?: 'spot' | 'perp' | 'option';
}

type DrawerTab = 'favorite' | 'spot' | 'perp' | 'option';
type CategoryTab = 'catCrypto' | 'catForex' | 'catMetal' | 'catCommodity' | 'catIndex' | 'catStock';
const CATEGORY_TABS: CategoryTab[] = ['catCrypto', 'catForex', 'catMetal', 'catCommodity', 'catIndex', 'catStock'];
const CATEGORY_MAP: Record<CategoryTab, string> = {
  catCrypto: 'crypto',
  catForex: 'forex',
  catMetal: 'metal',
  catCommodity: 'commodity',
  catIndex: 'index',
  catStock: 'stock',
};

export default function SymbolDrawer({ open, onClose, onPick, tradeType = 'spot' }: Props) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { isPc } = useResponsive();
  const [list, setList] = useState<SymbolRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<DrawerTab>(tradeType);
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('catCrypto');
  const [ticks, setTicks] = useState<Record<string, WsTick>>({});
  const [loadingList, setLoadingList] = useState(false);
  const { favorites: favs, toggleFavorite, isFavorite } = useFavoriteSymbols();
  const readSymbols = useMarketStore((state) => state.readSymbols);
  const getSymbols = useMarketStore((state) => state.getSymbols);

  useEffect(() => {
    if (!open) return;
    setActiveTab(tradeType);
    setActiveCategory('catCrypto');
    setKeyword('');
  }, [open, tradeType]);

  useEffect(() => {
    if (!open) return;
    const type = activeTab === 'favorite' ? tradeType : activeTab;
    const scope = type === 'spot' ? 'all' : 'active';
    const cachedRows = readSymbols(type, CATEGORY_MAP[activeCategory], scope, 'full');
    if (cachedRows.length) {
      setList(cachedRows);
    }
    let cancelled = false;
    setLoadingList(!cachedRows.length);
    getSymbols(type, CATEGORY_MAP[activeCategory], type === 'spot' ? 'all' : 'active', 180_000, 'full')
      .then((d) => {
        if (!cancelled) setList(d ?? []);
      })
      .catch(() => {
        if (!cancelled) setList([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCategory, activeTab, getSymbols, open, readSymbols, tradeType]);

  useEffect(() => {
    if (!open) return;
    const type = activeTab === 'favorite' ? tradeType : activeTab;
    const scope = type === 'spot' ? 'all' : 'active';
    const currentIndex = CATEGORY_TABS.indexOf(activeCategory);
    const neighbors = [CATEGORY_TABS[currentIndex + 1], CATEGORY_TABS[currentIndex - 1]]
      .filter(Boolean);
    neighbors.forEach((key) => {
      void getSymbols(type, CATEGORY_MAP[key as CategoryTab], scope, 180_000, 'full').catch(() => undefined);
    });
  }, [activeCategory, activeTab, getSymbols, open, tradeType]);

  useEffect(() => {
    if (!open) {
      setTicks({});
      return;
    }
    const codes = list
      .filter((row) => row.subscribeEnabled === 1)
      .map((row) => row.alltickCode)
      .filter(Boolean) as string[];
    if (!codes.length) return;
    return subscribeQuote(codes, (tick) => {
      setTicks((prev) => ({ ...prev, [tick.symbol]: tick }));
    });
  }, [list, open]);

  const filtered = useMemo(() => {
    const source = activeTab === 'favorite' ? list.filter((r) => favs.has(r.alltickCode)) : list;
    if (!keyword.trim()) return source;
    const k = keyword.trim().toUpperCase();
    return source.filter((r) => r.symbol.includes(k) || r.baseCoin.includes(k));
  }, [activeTab, favs, keyword, list]);

  const toggleRowFavorite = (event: React.MouseEvent, code: string) => {
    event.stopPropagation();
    const favorited = toggleFavorite(code);
    toast.success(favorited ? t('market.favoriteAdded', '已加入收藏') : t('market.favoriteRemoved', '已取消收藏'));
  };

  const handlePick = (row: SymbolRow) => {
    if (row.tradeType !== tradeType) {
      if (isViewOnlySpot(row)) {
        toast.info(t('market.limitedViewOnly', '当前外汇/受限现货仅支持查看行情，暂不支持完整下单交易'));
        nav(buildKlinePath(row, CATEGORY_MAP[activeCategory], row.tradeType, 'all'));
      } else {
        nav(buildTradePagePath(row.tradeType, row, CATEGORY_MAP[activeCategory]));
      }
      onClose();
      return;
    }
    if (isViewOnlySpot(row)) {
      toast.info(t('market.limitedViewOnly', '当前外汇/受限现货仅支持查看行情，暂不支持完整下单交易'));
      nav(buildKlinePath(row, CATEGORY_MAP[activeCategory], 'spot', 'all'));
      onClose();
      return;
    }
    onPick(row);
    onClose();
  };
  const content = (
    <div className="flex h-full flex-col">
      <AsterSearchBar value={keyword} onChange={setKeyword} placeholder={t('common.search')} />
      <div className="mt-5 flex gap-6 text-lg font-semibold">
        {([
          ['favorite', t('market.cFavorite')],
          ['spot', t('market.cSpot')],
          ['perp', t('market.cPerp')],
          ['option', t('market.cOption')],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`pb-2 ${key === activeTab ? 'border-b-2 border-text text-text' : 'text-textSub'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-5 overflow-x-auto text-sm font-semibold text-textSub scrollbar-none">
        {CATEGORY_TABS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveCategory(key)}
            className={`shrink-0 pb-2 ${activeCategory === key ? 'border-b-2 border-text text-text' : ''}`}
          >
            {t(`market.${key}`)}
          </button>
        ))}
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {loadingList && filtered.length === 0 ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`drawer-loading-${index}`} className="animate-pulse border-b border-line py-4">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-4 w-4 rounded bg-[#EDEDED]" />
                    <div className="h-9 w-9 rounded-full bg-[#EFEFEF]" />
                    <div className="min-w-0">
                      <div className="h-3 w-24 rounded bg-[#EFEFEF]" />
                      <div className="mt-2 h-3 w-16 rounded bg-[#F4F4F4]" />
                    </div>
                  </div>
                  <div className="h-4 w-12 rounded bg-[#EFEFEF]" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title={t('common.noData')} />
        ) : (
          <div>
            <ul>
            {filtered.map((r) => {
              const tick = r.alltickCode ? ticks[r.alltickCode] : undefined;
              const change = parseFiniteNumber(tick?.change ?? r.change);
              const up = (change ?? 0) >= 0;
              const price = tick?.price ?? r.price ?? '--';
              return (
                <li
                  key={r.symbol}
                  className="flex cursor-pointer items-center justify-between border-b border-line py-4 hover:bg-bgSection"
                  onClick={() => handlePick(r)}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      className="shrink-0 text-textSub"
                      onClick={(event) => toggleRowFavorite(event, r.alltickCode)}
                      aria-label="favorite"
                    >
                      <Star
                        size={16}
                        fill={isFavorite(r.alltickCode) ? '#1A1A1A' : 'none'}
                        stroke={isFavorite(r.alltickCode) ? '#1A1A1A' : 'currentColor'}
                      />
                    </button>
                    <PairCoinIcon
                      baseCoin={r.baseCoin}
                      quoteCoin={r.quoteCoin}
                      baseLogo={r.baseLogo}
                      quoteLogo={r.quoteLogo}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="inline-flex max-w-full items-start gap-[3px] leading-tight">
                        <span className="break-words text-[14px] font-semibold text-text">
                          {r.baseCoin}<span className="text-[12px] text-textSub">/{r.quoteCoin}</span>
                        </span>
                        <SymbolBadges row={r} className="mt-[1px]" />
                      </div>
                      <div className="truncate text-[11px] text-textSub num">
                        {price}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[11px] num ${up ? 'text-up' : 'text-down'}`}>
                    {formatChangePercent(change, r.changePrecision)}
                  </span>
                </li>
              );
            })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  if (!open) return null;

  if (isPc) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/45 pt-[92px]">
        <button type="button" aria-label="close" className="absolute inset-0" onClick={onClose} />
        <section className="relative flex h-[680px] max-h-[calc(100vh-120px)] w-[560px] flex-col rounded-lg border border-line bg-bg p-5 shadow-pop">
          {content}
        </section>
      </div>
    );
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex h-[78vh] flex-col px-4 pt-4">
        {content}
      </div>
    </BottomSheet>
  );
}
