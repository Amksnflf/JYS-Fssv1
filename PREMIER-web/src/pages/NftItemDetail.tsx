import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Copy, X } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { toast } from '@/components/Toast';
import { buyNft, fetchNftCollectionDetail, fetchNftItemDetail, type NftCollection, type NftItem } from '@/api/nft';
import { parseTraits } from '@/data/nftDisplay';
import { NftVisual, SectionTitle, Verified } from './Nft';
import { useResponsive } from '@/hooks/useResponsive';
import { PcContainer, PcDialog } from '@/components/pc';

type RouteState = {
  item?: NftItem;
  collection?: NftCollection;
};

export default function NftItemDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const itemId = Number(id);
  const state = useLocation().state as RouteState | null;
  const nav = useNavigate();
  const { isPc } = useResponsive();
  const [collection, setCollection] = useState<NftCollection | undefined>(state?.collection);
  const [item, setItem] = useState<NftItem | undefined>(state?.item);
  const [loading, setLoading] = useState(!state?.item);
  const [loadError, setLoadError] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(itemId)) return;
    if (!state?.item) setLoading(true);
    setLoadError(false);
    fetchNftItemDetail(itemId)
      .then((next) => {
        setItem(next);
        if (!state?.collection) {
          fetchNftCollectionDetail(next.collectionId).then(setCollection).catch(() => undefined);
        }
      })
      .catch((e) => {
        setLoadError(true);
        toast.error(e instanceof Error ? e.message : t('nft.loadFailed'));
      })
      .finally(() => setLoading(false));
  }, [itemId, state?.collection, state?.item, t]);

  if (!Number.isFinite(itemId)) return <Navigate to="/nft" replace />;
  if (loadError && !item) {
    return (
      <div className="min-h-screen bg-bg">
        <PageHeader title={t('nft.detail')} fallbackPath="/nft" />
        <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
          <div className="text-base text-textSub">{t('nft.loadFailed')}</div>
          <button onClick={() => nav('/nft', { replace: true })} className="mt-6 h-10 rounded-full bg-primary px-6 text-sm font-medium text-white">
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }
  if (loading || !item) {
    return (
      <div className="min-h-screen bg-bg">
        <PageHeader title={t('nft.detail')} fallbackPath="/nft" />
        <div className="px-4 pt-5">
          <div className="h-7 w-2/3 animate-pulse rounded bg-bgSoft" />
          <div className="mt-3 aspect-square animate-pulse rounded-2xl bg-bgSoft" />
          <div className="mt-6 h-24 animate-pulse rounded-xl bg-bgSoft" />
        </div>
      </div>
    );
  }
  const target = item;
  const traits = parseTraits(target.attributesJson);

  const buy = async () => {
    setBuying(true);
    try {
      await buyNft(target.id);
      toast.success(t('nft.buySuccess'));
      setPayOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('nft.buyFailed'));
    } finally {
      setBuying(false);
    }
  };

  if (isPc) {
    return (
      <div className="bg-bg py-10 text-text">
        <PcContainer>
          <Link to={collection ? `/nft/collection/${collection.id}` : '/nft'} className="mb-6 inline-flex items-center text-[14px] text-textSubPc hover:text-text">
            ← {collection?.name ?? 'NFT'}
          </Link>
          <div className="grid grid-cols-[480px_1fr] gap-10">
            <div className="aspect-square overflow-hidden rounded-lg border border-line">
              <NftVisual name={collection?.name ?? target.name} large />
            </div>
            <div>
              <h1 className="flex items-center text-[28px] font-bold text-text">{target.name} <Verified /></h1>
              <div className="num pc-price mt-2 text-[20px] font-semibold text-primary">{target.tokenNo ?? `#${target.id}`}</div>

              <div className="mt-6 rounded-lg border border-line bg-bg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] text-textSubPc">{t('nft.price')}</div>
                    <div className="num pc-price mt-2 text-[28px] font-semibold text-text">♦ {target.price} {target.coin}</div>
                    <div className="num pc-price mt-1 text-[14px] text-textSubPc">≈ ${target.usdPrice ?? '--'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] text-textSubPc">{t('nft.royalty')}</div>
                    <div className="num pc-price mt-2 text-[24px] font-semibold text-text">{target.royaltyRate ?? '0.5'}%</div>
                  </div>
                </div>
                <button onClick={() => setPayOpen(true)} className="pc-btn-primary mt-5 w-full pc-btn-lg">{t('nft.buy')}</button>
                <p className="mt-3 text-center text-[12px] text-textSubPc">{t('nft.royaltyDonate')}</p>
              </div>

              <div className="mt-8">
                <h3 className="pc-card-title">{t('nft.basicInfo')}</h3>
                <div className="mt-4 rounded-lg border border-line bg-bg p-5 text-[14px]">
                  <PcKvRow label={t('nft.contractAddress')} value={target.contractAddress ?? '--'} />
                  <PcKvRow label={t('nft.network')} value={target.network ?? '--'} />
                  <PcKvRow label={t('nft.tokenNo')} value={target.tokenCode ?? '--'} />
                  <PcKvRow label={t('nft.tokenStandard')} value={target.tokenStandard ?? '--'} last />
                </div>
              </div>

              {traits.length > 0 ? (
                <div className="mt-8">
                  <h3 className="pc-card-title">{t('nft.attributes')}</h3>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {traits.map((trait) => (
                      <div key={`${trait.type}-${trait.value}`} className="rounded-lg border border-line bg-bgSection p-4 text-center">
                        <div className="text-[13px] text-primary">{trait.type}</div>
                        <div className="mt-2 text-[16px] font-semibold text-text">{trait.value}</div>
                        <div className="mt-1 text-[12px] text-textSubPc">{trait.percent}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </PcContainer>

        <PcDialog open={payOpen} onClose={() => setPayOpen(false)} title={t('nft.buy')} width={520}>
          <div className="flex items-center gap-4 rounded-lg bg-bgSection p-4">
            <div className="h-16 w-16 overflow-hidden rounded-md">
              <NftVisual name={collection?.name ?? target.name} />
            </div>
            <div className="text-[14px]">
              <div className="font-semibold text-text">{target.name}</div>
              <div className="text-textSubPc">{target.tokenNo ?? `#${target.id}`}</div>
              <div className="mt-1 text-textSubPc">{collection?.name ?? 'ApeReunion'}</div>
            </div>
          </div>
          <div className="mt-5 flex h-14 items-center justify-between rounded-md bg-primary px-4 text-[16px] font-semibold text-white">
            <span>{t('nft.pendingPay')}</span>
            <span className="num pc-price">{target.price} ♦ ≈ {target.usdPrice ?? '--'} <span className="text-brandLight">₮</span></span>
          </div>
          <div className="mt-3 text-[13px] text-textSubPc">{t('nft.royalty')}: {target.royaltyRate ?? '0.5'}%</div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button onClick={() => setPayOpen(false)} className="pc-btn-ghost pc-btn-block pc-btn-lg">{t('common.cancel')}</button>
            <button disabled={buying} onClick={buy} className="pc-btn-primary pc-btn-block pc-btn-lg disabled:opacity-60">{t('nft.buyNow')}</button>
          </div>
        </PcDialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg md:bg-[#3c3c3c] md:py-6">
      <div className="mx-auto min-h-screen w-full max-w-md bg-bg pb-8">
        <PageHeader title={target.name} fallbackPath={collection ? `/nft/collection/${collection.id}` : '/nft'} />
        <main className="px-4 pt-5">
          <h1 className="flex items-center text-xl font-black">{target.name} <Verified /></h1>
          <div className="mt-3 text-[26px] font-black text-[#2f7d32]">{target.tokenNo ?? `#${target.id}`}</div>
          <div className="mt-2 aspect-square overflow-hidden rounded-2xl">
            <NftVisual name={collection?.name ?? target.name} large />
          </div>

          <div className="mt-6 rounded-xl bg-bg p-5 shadow-[0_2px_18px_rgba(0,0,0,0.1)]">
            <div className="grid grid-cols-2">
              <div>
                <div className="font-bold">{t('nft.price')}</div>
                <div className="mt-2 font-black">♦ {target.price} {target.coin} ≈ ${target.usdPrice ?? '--'}</div>
              </div>
              <div className="text-right">
                <div className="font-bold">{t('nft.royalty')}</div>
                <div className="mt-2 text-2xl font-black">{target.royaltyRate ?? '0.5'}%</div>
              </div>
            </div>
            <div className="mt-4 text-center text-sm font-bold">{t('nft.royaltyDonate')}</div>
          </div>

          <button onClick={() => setPayOpen(true)} className="mt-6 h-16 w-full rounded-full bg-primary text-xl font-black text-white">
            {t('nft.buy')}
          </button>

          <section className="mt-7">
            <SectionTitle>{t('nft.basicInfo')}</SectionTitle>
            <InfoRow label={t('nft.contractAddress')} value={target.contractAddress ?? '--'} />
            <InfoRow label={t('nft.network')} value={target.network ?? '--'} />
            <InfoRow label={t('nft.tokenNo')} value={target.tokenCode ?? '--'} />
            <InfoRow label={t('nft.tokenStandard')} value={target.tokenStandard ?? '--'} />
          </section>

          <section className="mt-7">
            <SectionTitle>{t('nft.attributes')}</SectionTitle>
            <div className="mt-4 space-y-3">
              {traits.map((trait) => (
                <div key={`${trait.type}-${trait.value}`} className="rounded-xl bg-bg p-5 text-center shadow-[0_2px_14px_rgba(0,0,0,0.08)]">
                  <div className="text-lg font-bold text-[#2f7d32]">{trait.type}</div>
                  <div className="mt-2 text-lg font-black">{trait.value}</div>
                  <div className="mt-2 text-lg font-semibold text-textSub">{trait.percent}</div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      {payOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65">
          <section className="aster-bottom-sheet w-full max-w-md rounded-t-2xl bg-bg px-4 pb-safe pt-3">
            <div className="mx-auto h-1 w-8 rounded-full bg-line" />
            <button onClick={() => setPayOpen(false)} className="ml-auto mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white" aria-label="close">
              <X size={22} />
            </button>
            <div className="flex flex-col items-center">
              <div className="h-20 w-20 overflow-hidden rounded-full bg-[#ffc72c]">
                <NftVisual name={collection?.name ?? target.name} />
              </div>
              <div className="mt-4 text-2xl font-black">{t('nft.balance')}：0<span className="text-[#2f7d32]">₮</span></div>
              <div className="mt-2 flex items-center text-2xl">test04***st0430 <Copy size={17} className="ml-1 text-textSub" /></div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-16 w-16 overflow-hidden">
                <NftVisual name={collection?.name ?? target.name} />
              </div>
              <div className="text-lg font-medium">
                <div>{target.name}</div>
                <div>{target.tokenNo ?? `#${target.id}`}</div>
                <Link to={collection ? `/nft/collection/${collection.id}` : '/nft'}>{collection?.name ?? 'ApeReunion'} <span>✓</span></Link>
              </div>
            </div>
            <div className="mt-5 flex h-16 items-center justify-between rounded-lg bg-primary px-4 text-xl font-bold text-white">
              <span>{t('nft.pendingPay')}</span>
              <span>{target.price} ♦ ≈ {target.usdPrice ?? '--'}<span className="text-[#63c46c]">₮</span></span>
            </div>
            <div className="mt-4 font-bold">{t('nft.royalty')}: {target.royaltyRate ?? '0.5'}%</div>
            <div className="mt-10 grid grid-cols-2 gap-4">
              <button onClick={() => setPayOpen(false)} className="h-14 rounded-full bg-bgSoft text-lg font-black">{t('common.cancel')}</button>
              <button disabled={buying} onClick={buy} className="h-14 rounded-full bg-primary text-lg font-black text-white disabled:opacity-60">{t('nft.buyNow')}</button>
            </div>
          </section>
        </div>,
        document.body
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 flex items-center justify-between text-lg">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function PcKvRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-3 ${last ? '' : 'border-b border-line'}`}>
      <span className="text-textSubPc">{label}</span>
      <span className="num pc-price max-w-[60%] truncate text-right text-text">{value}</span>
    </div>
  );
}
