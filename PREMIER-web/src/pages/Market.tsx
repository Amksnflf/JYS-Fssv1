import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, Heart } from 'lucide-react';
import { fetchSymbols, fetchNewsPage, type SymbolRow, type NewsItem } from '@/api/quote';
import { readCachedQuoteTicks, subscribeQuote, type WsTick } from '@/api/quoteWS';
import { fetchDynamics, likeDynamic, submitDynamic, type DynamicItem } from '@/api/dynamic';
import { toast } from '@/components/Toast';
import { AsterSearchBar, EmptyState, PairCoinIcon, QuoteChangeBadge } from '@/components/AsterUI';
import { SymbolBadges } from '@/components/SymbolBadges';
import { formatChangePercent, parseFiniteNumber } from '@/utils/number';
import { buildKlinePath, buildTradePagePath, isViewOnlySpot } from '@/utils/market';
import { formatNewsTime, getNewsAvatar, getNewsCover, getNewsPreviewText } from '@/utils/newsMedia';
import { useResponsive } from '@/hooks/useResponsive';
import { PcContainer } from '@/components/pc';
import { useFavoriteSymbols } from '@/hooks/useFavoriteSymbols';
import { useMarketStore } from '@/store/marketStore';
import { brandName } from '@/brand';

const MAIN_TABS = ['tabPrice', 'tabNews', 'tabDynamic'] as const;
const SUB_TABS = ['cFavorite', 'cSpot', 'cPerp', 'cOption'] as const;
const CATS = ['catCrypto', 'catForex', 'catMetal', 'catCommodity', 'catIndex', 'catStock'] as const;
const MOBILE_MARKET_LIST_GRID = 'grid grid-cols-[minmax(0,1fr)_82px_70px] items-center gap-x-2.5';
const CATEGORY_MAP: Record<(typeof CATS)[number], string> = {
  catCrypto: 'crypto',
  catForex: 'forex',
  catMetal: 'metal',
  catCommodity: 'commodity',
  catIndex: 'index',
  catStock: 'stock',
};

function formatVolume(v: string | undefined): string {
  if (!v) return '--';
  const n = Number(v);
  if (!isFinite(n) || n === 0) return '--';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function formatPrice(p: string | null | undefined, precision = 4): string {
  if (!p) return '--';
  const n = Number(p);
  if (!isFinite(n)) return '--';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: Math.min(precision, 8),
    maximumFractionDigits: Math.min(precision, 8),
  });
}

function NewsAvatar({ authorAvatar, sourceName }: { authorAvatar?: string; sourceName?: string }) {
  return (
    <img
      src={authorAvatar}
      alt={sourceName || ''}
      className="h-10 w-10 shrink-0 rounded-full object-cover"
    />
  );
}

function NewsPreview({ title, summary }: { title: string; summary?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col justify-between bg-[linear-gradient(180deg,#fafafa_0%,#f3f5f7_100%)] p-4">
      <div className="line-clamp-4 text-sm leading-6 text-textSubPc">{summary || title}</div>
      <div className="mt-4 text-xs font-medium text-textSubPc">{t('market.inAppSummary')}</div>
    </div>
  );
}

export default function MarketPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isPc } = useResponsive();
  const [mainTab, setMainTab] = useState<(typeof MAIN_TABS)[number]>('tabPrice');
  const [subTab, setSubTab] = useState<(typeof SUB_TABS)[number]>('cSpot');
  const [cat, setCat] = useState<(typeof CATS)[number]>('catCrypto');

  const [rows, setRows] = useState<SymbolRow[]>([]);
  const [ticks, setTicks] = useState<Record<string, WsTick>>(() => readCachedQuoteTicks());
  const [loadingRows, setLoadingRows] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [dynamics, setDynamics] = useState<DynamicItem[]>([]);
  const [dynamicText, setDynamicText] = useState('');
  const [keyword, setKeyword] = useState('');
  const { favorites: favs, isFavorite } = useFavoriteSymbols();
  const readSymbols = useMarketStore((state) => state.readSymbols);
  const getSymbols = useMarketStore((state) => state.getSymbols);

  const tradeType = useMemo(() => {
    if (subTab === 'cPerp') return 'perp';
    if (subTab === 'cOption') return 'option';
    return 'spot';
  }, [subTab]);
  const category = CATEGORY_MAP[cat];

  useEffect(() => {
    const nextMainTab = searchParams.get('tab');
    const nextSubTab = searchParams.get('subTab');
    const nextCat = searchParams.get('cat');

    if (nextMainTab && MAIN_TABS.includes(nextMainTab as (typeof MAIN_TABS)[number])) {
      setMainTab(nextMainTab as (typeof MAIN_TABS)[number]);
    }
    if (nextSubTab && SUB_TABS.includes(nextSubTab as (typeof SUB_TABS)[number])) {
      setSubTab(nextSubTab as (typeof SUB_TABS)[number]);
    }
    if (nextCat && CATS.includes(nextCat as (typeof CATS)[number])) {
      setCat(nextCat as (typeof CATS)[number]);
    }
  }, [searchParams]);

  // 拉交易对列表
  useEffect(() => {
    if (mainTab !== 'tabPrice') return;
    const scope = tradeType === 'spot' ? 'all' : 'active';
    const cachedRows = readSymbols(tradeType, category, scope, 'light');
    if (cachedRows.length) setRows(cachedRows);
    let cancel = false;
    setLoadingRows(!cachedRows.length);
    getSymbols(tradeType, category, scope, 180_000, 'light')
      .then((data) => {
        if (!cancel) setRows(data ?? []);
      })
      .catch(() => !cancel && setRows([]))
      .finally(() => {
        if (!cancel) setLoadingRows(false);
      });
    return () => {
      cancel = true;
    };
  }, [category, getSymbols, mainTab, readSymbols, tradeType]);

  useEffect(() => {
    if (mainTab !== 'tabPrice') return;
    const scope = tradeType === 'spot' ? 'all' : 'active';
    const currentIndex = CATS.findIndex((key) => CATEGORY_MAP[key] === category);
    const categoriesToPrime = [CATS[currentIndex + 1], CATS[currentIndex - 1]]
      .filter(Boolean)
      .map((key) => CATEGORY_MAP[key as (typeof CATS)[number]]);
    categoriesToPrime.forEach((nextCategory) => {
      void getSymbols(tradeType, nextCategory, scope, 180_000, 'light').catch(() => undefined);
    });
  }, [category, getSymbols, mainTab, tradeType]);

  // WS 订阅
  const codesRef = useRef<string[]>([]);
  useEffect(() => {
    const codes = rows
      .filter((r) => r.subscribeEnabled === 1)
      .map((r) => r.alltickCode)
      .filter(Boolean) as string[];
    codesRef.current = codes;
    if (!codes.length) return;
    const off = subscribeQuote(codes, (tick) => {
      setTicks((prev) => ({ ...prev, [tick.symbol]: tick }));
    });
    return off;
  }, [rows]);

  // 新闻（lang 与界面语言一致，需库中存在对应 lang 的种子）
  useEffect(() => {
    if (mainTab !== 'tabNews') return;
    fetchNewsPage(1, 20, i18n.language)
      .then((d) => setNews(d?.records ?? []))
      .catch(() => setNews([]));
  }, [mainTab, i18n.language]);

  useEffect(() => {
    if (mainTab !== 'tabDynamic') return;
    fetchDynamics(1, 30).then((p) => setDynamics(p?.records ?? [])).catch(() => setDynamics([]));
  }, [mainTab]);

  const publishDynamic = async () => {
    if (!dynamicText.trim()) {
      toast.error(t('market.dynamicRequired'));
      return;
    }
    try {
      await submitDynamic(dynamicText.trim());
      setDynamicText('');
      toast.success(t('market.dynamicPublishSuccess'));
      const p = await fetchDynamics(1, 30);
      setDynamics(p?.records ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? t('market.dynamicPublishFailed'));
    }
  };

  const onLikeDynamic = async (id: number) => {
    try {
      const next = await likeDynamic(id);
      setDynamics((rows) => rows.map((r) => (r.id === id ? next : r)));
    } catch (e: any) {
      toast.error(e?.message ?? t('market.likeFailed'));
    }
  };

  const openTradePage = (row: SymbolRow) => {
    if (isViewOnlySpot(row)) {
      toast.info(t('market.limitedViewOnly', '当前外汇/受限现货仅支持查看行情，暂不支持完整下单交易'));
      navigate(buildKlinePath(row, category, row.tradeType, 'all'));
      return;
    }
    navigate(buildTradePagePath(row.tradeType, row, category));
  };

  const visibleRows = useMemo(() => {
    let list = rows;
    if (subTab === 'cFavorite') {
      list = list.filter((r) => favs.has(r.alltickCode));
    }
    if (keyword.trim()) {
      const k = keyword.trim().toUpperCase();
      list = list.filter((r) => r.symbol.includes(k) || r.baseCoin.includes(k));
    }
    return list;
  }, [rows, subTab, favs, keyword]);

  if (isPc) {
    return (
      <div className="bg-[#FCFCFC] py-10">
        <PcContainer>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="m-0 text-[34px] font-semibold leading-none tracking-[-0.03em] text-text">{t('nav.market')}</h1>
              <p className="mt-3 text-[13px] text-textSubPc">{t('discover.searchPair')}</p>
            </div>
            <div className="w-[340px] [&_.aster-search]:h-11 [&_.aster-search]:rounded-full [&_.aster-search]:border-0 [&_.aster-search]:bg-[#F5F5F5] [&_.aster-search]:shadow-none">
              <AsterSearchBar value={keyword} onChange={setKeyword} placeholder={t('discover.searchPair')} />
            </div>
          </div>

          <div className="mt-7 flex items-center gap-8">
            {MAIN_TABS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setMainTab(k)}
                className={`relative pb-2 text-[15px] transition ${
                  mainTab === k ? 'font-bold text-primary' : 'text-textSubPc hover:text-text'
                }`}
              >
                {t(`market.${k}`)}
                {mainTab === k ? <span className="absolute inset-x-1 bottom-0 h-[2.5px] rounded-full bg-primary" /> : null}
              </button>
            ))}
          </div>

          {mainTab === 'tabPrice' && (
            <>
              <div className="mt-7 flex flex-wrap items-center gap-2">
                {SUB_TABS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSubTab(k)}
                    className={`h-8 rounded-full px-4 text-[13px] transition ${
                      subTab === k ? 'bg-primary font-semibold text-white shadow-sm' : 'border border-line bg-white text-textSubPc hover:bg-[#F4F4F4] hover:text-text'
                    }`}
                  >
                    {t(`market.${k}`)}
                  </button>
                ))}
                <span className="mx-2 h-1 w-1 rounded-full bg-[#D8D8D8]" />
                {CATS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setCat(k)}
                    className={`h-8 rounded-full px-4 text-[13px] transition ${
                      cat === k ? 'border border-primary/30 bg-primary/10 font-semibold text-primary' : 'text-textSubPc hover:bg-white hover:text-text'
                    }`}
                  >
                    {t(`market.${k}`)}
                  </button>
                ))}
              </div>

              <PcMarketList
                rows={visibleRows}
                ticks={ticks}
                favs={favs}
                openTradePage={openTradePage}
                emptyText={subTab === 'cFavorite' ? t('market.noFav') : t('common.noData')}
                loading={loadingRows}
              />
            </>
          )}

          {mainTab === 'tabNews' && (
            <div className="mt-6 grid grid-cols-3 gap-5">
              {news.length === 0 ? (
                <div className="col-span-3 pc-empty">{t('market.newsEmpty')}</div>
              ) : (
                news.map((n) => (
                  <Link to={`/news/${n.id}`} key={n.id} className="block rounded-lg border border-line bg-bg p-5 transition hover:shadow-pcCard">
                    <div className="flex items-center gap-3">
                      <NewsAvatar authorAvatar={getNewsAvatar(n)} sourceName={n.author || n.sourceName} />
                      <div>
                        <div className="text-[14px] font-semibold text-text">{n.author || n.sourceName || brandName}</div>
                        <div className="text-[12px] text-textSubPc">{formatNewsTime(n.publishedAt)}</div>
                      </div>
                    </div>
                    <h3 className="mt-4 line-clamp-2 text-[18px] font-semibold leading-7 text-text">{n.title}</h3>
                    <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-textSubPc">{getNewsPreviewText(n)}</p>
                    <div className="mt-4 h-[180px] overflow-hidden rounded-md bg-bgSection">
                      <img src={getNewsCover(n)} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[13px] text-textSubPc">
                      <span className="flex items-center gap-2"><Heart size={16} />{n.likeCount ?? 0}</span>
                      <span className="flex items-center gap-2"><Eye size={16} />{n.viewCount ?? 0}</span>
                      {n.tagCoin && (
                        <span className={`rounded px-2 py-0.5 ${Number(n.tagChange ?? 0) >= 0 ? 'bg-upBg text-up' : 'bg-downBg text-down'}`}>
                          {n.tagCoin} {formatChangePercent(n.tagChange ?? 0, 2)}
                        </span>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {mainTab === 'tabDynamic' && (
            <div className="mt-6">
              <div className="rounded-lg border border-line bg-bg p-5">
                <textarea
                  value={dynamicText}
                  onChange={(e) => setDynamicText(e.target.value)}
                  placeholder={t('market.dynamicPlaceholder')}
                  className="h-24 w-full resize-none bg-transparent text-[14px] outline-none placeholder:text-textMute"
                />
                <div className="mt-3 flex justify-end">
                  <button onClick={publishDynamic} className="pc-btn-dark">
                    {t('market.publishDynamic')}
                  </button>
                </div>
              </div>
              {dynamics.length === 0 ? (
                <div className="pc-empty mt-6">{t('market.dynamicEmpty')}</div>
              ) : (
                <ul className="mt-6 space-y-4">
                  {dynamics.map((d) => (
                    <li key={d.id} className="rounded-lg bg-bgSection p-5">
                      <div className="flex items-center justify-between text-[12px] text-textSubPc">
                        <span>UID {d.userId}</span>
                        <span>{d.createdAt}</span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-[14px] leading-6 text-text">{d.content}</p>
                      <div className="mt-4 flex gap-6 text-[12px] text-textSubPc">
                        <button onClick={() => onLikeDynamic(d.id)} className="hover:text-text">
                          {t('market.likeCount', { count: d.likeCount ?? 0 })}
                        </button>
                        <span>{t('market.commentCount', { count: d.commentCount ?? 0 })}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </PcContainer>
      </div>
    );
  }

  return (
    <div className="aster-page">
      {/* 搜索 */}
      <AsterSearchBar value={keyword} onChange={setKeyword} placeholder={t('discover.searchPair')} />

      {/* 主 Tab */}
      <div className="mt-4 flex gap-6 text-lg font-bold border-b border-line/60">
        {MAIN_TABS.map((k) => (
          <button
            key={k}
            onClick={() => setMainTab(k)}
            className={`pb-2.5 transition ${
              mainTab === k
                ? 'border-b-2 border-primary text-primary font-bold'
                : 'text-textSub hover:text-text'
            }`}
          >
            {t(`market.${k}`)}
          </button>
        ))}
      </div>

      {mainTab === 'tabPrice' && (
        <>
          {/* 子 Tab */}
          <div className="mt-3.5 flex gap-2 overflow-x-auto text-xs font-semibold scrollbar-none">
            {SUB_TABS.map((k) => (
              <button
                key={k}
                onClick={() => setSubTab(k)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 transition ${
                  subTab === k
                    ? 'bg-primary text-white shadow-sm'
                    : 'border border-[#E8EEF3] bg-white text-textSub hover:text-text'
                }`}
              >
                {t(`market.${k}`)}
              </button>
            ))}
          </div>

          {/* 分类 */}
          <div className="mt-3 flex gap-2 overflow-x-auto text-xs font-medium text-textSub scrollbar-none">
            {CATS.map((k) => (
              <button
                key={k}
                onClick={() => setCat(k)}
                className={`shrink-0 rounded-full px-3 py-1 transition ${
                  cat === k
                    ? 'border border-primary/30 bg-primary/10 font-bold text-primary'
                    : 'border border-transparent bg-bgSoft hover:text-text'
                }`}
              >
                {t(`market.${k}`)}
              </button>
            ))}
          </div>

          {/* 列表 */}
          <div className="mt-3.5 rounded-2xl border border-[#E8EEF3] bg-white p-3.5 shadow-card">
            <div className={`${MOBILE_MARKET_LIST_GRID} px-1 pb-2 text-[11px] font-semibold text-textSub border-b border-line/60`}>
              <div>{t('market.colName')}</div>
              <div className="text-right">{t('market.colPrice')}</div>
              <div className="text-right">{t('market.colChange')}</div>
            </div>

            {loadingRows && visibleRows.length === 0 ? (
              <MarketListSkeleton mobile />
            ) : visibleRows.length === 0 ? (
              <EmptyState title={subTab === 'cFavorite' ? t('market.noFav') : t('common.noData')} />
            ) : (
              <div className="divide-y divide-line/40">
                {visibleRows.map((r) => {
                  const tick = ticks[r.alltickCode];
                  const price = tick?.price ?? r.price ?? null;
                  const change = parseFiniteNumber(tick?.change ?? r.change);
                  return (
                    <div
                      key={`${r.tradeType}-${r.symbol}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => openTradePage(r)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') openTradePage(r);
                      }}
                      className={`${MOBILE_MARKET_LIST_GRID} cursor-pointer py-3 px-1 hover:bg-bgSoft/60 rounded-xl transition`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5 pr-2">
                        <PairCoinIcon
                          baseCoin={r.baseCoin}
                          quoteCoin={r.quoteCoin}
                          baseLogo={r.baseLogo}
                          quoteLogo={r.quoteLogo}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-1 leading-tight">
                            <span className="break-words text-[13px] font-bold text-text">
                              {r.baseCoin}
                            </span>
                            <span className="text-[11px] text-textSub font-medium">/{r.quoteCoin}</span>
                            <SymbolBadges
                              row={r}
                              className="mt-[1px]"
                              hotIconClassName="translate-y-[0.5px]"
                            />
                          </div>
                          <div className="mt-0.5 break-all text-[11px] text-textSub num">{formatVolume(tick?.volume ?? r.volume)}</div>
                        </div>
                      </div>
                      <div className="min-w-0 self-center text-right num pr-1">
                        <div className="text-[15px] font-bold text-text">{formatPrice(price, r.pricePrecision)}</div>
                        <div className="text-[11px] text-textSub">${formatPrice(price, r.pricePrecision)}</div>
                      </div>
                      <div className="flex justify-end self-center">
                        <QuoteChangeBadge value={change} precision={r.changePrecision} compact />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {mainTab === 'tabNews' && (
        <div className="mt-4">
          {news.length === 0 ? (
            <EmptyState title={t('market.newsEmpty')} />
          ) : (
            <ul className="space-y-4">
              {news.map((n) => (
                <li key={n.id}>
                  <Link to={`/news/${n.id}`} className="block aster-card p-4">
                  <div className="flex items-center gap-3">
                    <NewsAvatar authorAvatar={getNewsAvatar(n)} sourceName={n.author || n.sourceName} />
                    <div>
                    <div className="font-bold">{n.author || n.sourceName || brandName}</div>
                      <div className="mt-0.5 text-xs text-textSub">{formatNewsTime(n.publishedAt)}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-base font-bold leading-6">{n.title}</div>
                  <div className="mt-2 line-clamp-3 text-sm leading-6 text-textSub">{getNewsPreviewText(n)}</div>
                  <div className="mt-3 overflow-hidden rounded-xl bg-bgSoft">
                    <img src={getNewsCover(n)} alt="" className="h-44 w-full object-cover" />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-textSub">
                    <span className="flex items-center gap-2"><Heart size={17} />{n.likeCount ?? 0}</span>
                    <span className="flex items-center gap-2"><Eye size={17} />{n.viewCount ?? 0}</span>
                        {n.tagCoin && (
                          <span
                            className={`px-1.5 py-0.5 rounded num ${
                              Number(n.tagChange ?? 0) >= 0
                                ? 'bg-upBg text-up'
                                : 'bg-downBg text-down'
                            }`}
                          >
                            {n.tagCoin}{' '}
                            {formatChangePercent(n.tagChange ?? 0, 2)}
                          </span>
                        )}
                  </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mainTab === 'tabDynamic' && (
        <div className="mt-4">
          <div className="rounded-lg border border-line p-3">
            <textarea
              value={dynamicText}
              onChange={(e) => setDynamicText(e.target.value)}
              placeholder={t('market.dynamicPlaceholder')}
              className="h-24 w-full resize-none bg-transparent text-sm outline-none placeholder:text-textSub"
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={publishDynamic}
                className="h-9 rounded-full bg-primary px-4 text-xs text-white"
              >
                {t('market.publishDynamic')}
              </button>
            </div>
          </div>
          {dynamics.length === 0 ? (
            <EmptyState title={t('market.dynamicEmpty')} />
          ) : (
            <ul className="mt-3 space-y-3">
              {dynamics.map((d) => (
                <li key={d.id} className="rounded-lg bg-bgSoft p-3">
                  <div className="flex items-center justify-between text-xs text-textSub">
                    <span>UID {d.userId}</span>
                    <span>{d.createdAt}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{d.content}</p>
                  <div className="mt-3 flex gap-4 text-xs text-textSub">
                    <button onClick={() => onLikeDynamic(d.id)}>{t('market.likeCount', { count: d.likeCount ?? 0 })}</button>
                    <span>{t('market.commentCount', { count: d.commentCount ?? 0 })}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function PcMarketList({
  rows,
  ticks,
  favs,
  openTradePage,
  emptyText,
  loading,
}: {
  rows: SymbolRow[];
  ticks: Record<string, WsTick>;
  favs: Set<string>;
  openTradePage: (row: SymbolRow) => void;
  emptyText: string;
  loading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <section className="mt-6 overflow-hidden rounded-[18px] bg-white p-3 shadow-[0_18px_48px_rgba(4,3,3,0.06)]">
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_110px] gap-3 px-4 py-3 text-[12px] font-medium text-textSubPc">
        <span>{t('market.colName')}</span>
        <span className="text-right">{t('market.colPrice')}</span>
        <span className="text-right">24h {t('market.colVolume')}</span>
        <span className="text-right">{t('market.colChange')}</span>
      </div>
      {loading && rows.length === 0 ? (
        <MarketListSkeleton />
      ) : rows.length === 0 ? (
        <div className="py-14">
          <EmptyState title={emptyText} />
        </div>
      ) : (
        <div className="relative">
          {loading ? <div className="pointer-events-none absolute inset-x-4 top-0 z-[1] h-1 rounded-full bg-[#ECECEC]" /> : null}
          <ul className="space-y-1">
          {rows.map((r) => {
            const tick = ticks[r.alltickCode];
            const price = tick?.price ?? r.price ?? null;
            const change = parseFiniteNumber(tick?.change ?? r.change);
            return (
              <li
                key={`${r.tradeType}-${r.symbol}`}
                role="button"
                tabIndex={0}
                onClick={() => openTradePage(r)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') openTradePage(r);
                }}
                className="grid cursor-pointer grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_110px] items-center gap-3 rounded-[14px] px-4 py-3.5 transition hover:bg-[#F7F7F7]"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <PairCoinIcon
                    baseCoin={r.baseCoin}
                    quoteCoin={r.quoteCoin}
                    baseLogo={r.baseLogo}
                    quoteLogo={r.quoteLogo}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-[2px] leading-tight text-text">
                      <span className="min-w-0 truncate whitespace-nowrap text-[12px] font-semibold">{r.baseCoin}/{r.quoteCoin}</span>
                      <SymbolBadges row={r} className="mt-[1px] -ml-[1px]" hotIconClassName="translate-y-[0.5px]" />
                    </div>
                    <div className="mt-1 break-all text-[10px] text-textSubPc num pc-price">{formatVolume(tick?.volume ?? r.volume)}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="num pc-price text-[14px] font-semibold text-text">{formatPrice(price, r.pricePrecision)}</div>
                  <div className="num pc-price text-[11px] text-textSubPc">${formatPrice(price, r.pricePrecision)}</div>
                </div>

                <div className="num pc-price text-right text-[14px] text-textSubPc">
                  {formatVolume(tick?.volume ?? r.volume)}
                </div>

                <div className="flex justify-end">
                  <QuoteChangeBadge value={change} precision={r.changePrecision} compact />
                </div>
              </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function MarketListSkeleton({ mobile = false }: { mobile?: boolean }) {
  const rows = mobile ? 6 : 5;
  return (
    <div className={mobile ? 'space-y-3 py-2' : 'space-y-2 px-1 py-3'}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={`market-skeleton-${mobile ? 'm' : 'p'}-${index}`}
          className={`animate-pulse ${mobile ? `${MOBILE_MARKET_LIST_GRID} border-b border-line px-0 py-3` : 'grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_110px] items-center gap-3 rounded-[14px] px-4 py-3.5'}`}
        >
          <div className={mobile ? 'flex items-start gap-2.5 pr-2' : 'flex items-center gap-3'}>
            <div className="h-7 w-7 rounded-full bg-[#EFEFEF]" />
            <div className="min-w-0 flex-1">
              <div className="h-3 w-24 rounded bg-[#EFEFEF]" />
              <div className="mt-2 h-3 w-16 rounded bg-[#F4F4F4]" />
            </div>
          </div>
          <div className={mobile ? 'ml-auto h-4 w-[60px] rounded bg-[#EFEFEF]' : 'ml-auto h-4 w-20 rounded bg-[#EFEFEF]'} />
          <div className={mobile ? 'ml-auto h-6 w-[66px] rounded-full bg-[#F2F2F2]' : 'ml-auto h-4 w-16 rounded bg-[#F2F2F2]'} />
          {!mobile ? <div className="ml-auto h-8 w-20 rounded-full bg-[#F6F6F6]" /> : null}
        </div>
      ))}
    </div>
  );
}
