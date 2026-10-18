import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { fetchNftCollectionDetail, fetchNftItems, type NftCollection, type NftItem } from '@/api/nft';
import { collectionTheme, makeCollectionItems } from '@/data/nftDisplay';
import { NftVisual, SectionTitle, Verified } from './Nft';
import { useResponsive } from '@/hooks/useResponsive';
import { PcContainer } from '@/components/pc';

export default function NftCollectionDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { isPc } = useResponsive();
  const collectionId = Number(id);
  const [collection, setCollection] = useState<NftCollection | undefined>();
  const [items, setItems] = useState<NftItem[]>([]);

  useEffect(() => {
    if (Number.isFinite(collectionId)) {
      fetchNftCollectionDetail(collectionId).then(setCollection).catch(() => setCollection(undefined));
      fetchNftItems(collectionId, 1, 1, 40).then((page) => setItems(page?.records ?? [])).catch(() => setItems([]));
    }
  }, [collectionId]);

  const displayItems = useMemo(() => makeCollectionItems(collection, items), [collection, items]);

  if (!Number.isFinite(collectionId)) return <Navigate to="/nft" replace />;

  if (isPc) {
    return (
      <div className="bg-bg py-10 text-text">
        <PcContainer>
          <div className={`relative h-[260px] overflow-hidden rounded-lg ${collectionTheme(collection?.name)}`}>
            {collection?.banner ? <img src={collection.banner} alt="" className="h-full w-full object-cover opacity-80" /> : null}
          </div>
          <div className="mt-[-40px] flex items-end gap-6 px-2">
            <div className="flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-full bg-bg p-1.5">
              <div className="h-full w-full overflow-hidden rounded-full">
                <NftVisual name={collection?.name ?? 'ApeReunion'} large />
              </div>
            </div>
            <div className="flex-1 pb-2">
              <h1 className="flex items-center text-[28px] font-bold text-text">
                {collection?.name ?? 'ApeReunion'} <Verified />
              </h1>
              <p className="mt-2 text-[14px] text-textSubPc line-clamp-2">{collection?.description}</p>
            </div>
            <Link to="/assets/nft/manage" className="pc-btn-ghost">{t('nft.order')}</Link>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-5">
            <PcMetric label={t('nft.totalVolume')} value={String(Number(collection?.volume ?? 0).toFixed(0))} />
            <PcMetric label={t('nft.latestPrice')} value={`${Number(collection?.latestPrice ?? 0).toString()} ETH`} />
            <PcMetric label={t('nft.collectionCount')} value={`${Math.round((collection?.itemCount ?? 23000) / 1000)}k`} />
          </div>

          <section className="mt-12">
            <h2 className="pc-h3 m-0">{t('nft.projectDetail')}</h2>
            <div className="mt-6 grid grid-cols-5 gap-5">
              {displayItems.length === 0 ? (
                <div className="col-span-5 py-12 text-center text-[14px] text-textSubPc">{t('common.noData')}</div>
              ) : (
                displayItems.map((item, index) => (
                  <Link key={item.id} to={`/nft/item/${item.id}`} state={{ item, collection }} className="block transition hover:-translate-y-0.5">
                    <article className="overflow-hidden rounded-lg border border-line bg-bg shadow-pcCard">
                      <div className="relative aspect-square">
                        <NftVisual name={collection?.name || item.name} large />
                        <div className="absolute inset-x-0 bottom-0 flex h-9 items-center bg-black/45 px-3 text-[13px] font-bold text-white">
                          <span className="truncate">{item.name}</span>
                          <Verified />
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 text-[13px] font-bold text-text">
                        <span className="text-primary">{Number(item.price).toFixed(index === 1 ? 1 : 4).replace(/\.?0+$/, '')} {item.coin}</span>
                        <span className="text-textSubPc">{item.tokenNo ?? `#${item.id}`}</span>
                      </div>
                    </article>
                  </Link>
                ))
              )}
            </div>
          </section>
        </PcContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg md:bg-[#3c3c3c] md:py-6">
      <div className="mx-auto min-h-screen w-full max-w-md bg-bg pb-8">
        <PageHeader title={collection?.name ?? 'NFT'} fallbackPath="/nft" right={<Link to="/assets/nft/manage" className="text-lg text-[#2f7d32]">{t('nft.order')}</Link>} />

        <section>
          <div className={`h-[146px] rounded-b-lg ${collectionTheme(collection?.name)} px-5 py-4`}>
            {collection?.banner ? <img src={collection.banner} alt="" className="h-full w-full rounded-lg object-cover opacity-70" /> : <div className="h-full rounded-lg bg-black/20" />}
          </div>
          <div className="px-4">
            <div className="-mt-8 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-bg p-1">
              <div className="h-full w-full overflow-hidden rounded-full">
                <NftVisual name={collection?.name ?? 'ApeReunion'} />
              </div>
            </div>
            <h1 className="mt-2 flex items-center text-xl font-black">
              {collection?.name ?? 'ApeReunion'} <Verified />
            </h1>
            <div className="mt-5 grid grid-cols-3 text-base">
              <Metric label={t('nft.totalVolume')} value={String(Number(collection?.volume ?? 0).toFixed(0))} />
              <Metric label={t('nft.latestPrice')} value={`${Number(collection?.latestPrice ?? 0).toString()} ETH`} />
              <Metric label={t('nft.collectionCount')} value={`${Math.round((collection?.itemCount ?? 23000) / 1000)}k`} />
            </div>
          </div>
        </section>

        <div className="mt-4 border-y border-line px-4 py-6 text-lg font-semibold leading-6 text-textSub">
          {collection?.description ?? ''}
          <button className="mt-4 block text-[#2f7d32]">{t('nft.showMore')}</button>
        </div>

        <main className="px-4 pt-6">
          <SectionTitle>{t('nft.projectDetail')}</SectionTitle>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {displayItems.length === 0 ? <div className="col-span-2 py-12 text-center text-textSub">{t('common.noData')}</div> : displayItems.map((item, index) => (
              <Link key={item.id} to={`/nft/item/${item.id}`} state={{ item, collection }} className="block">
                <NftItemCard item={item} index={index} collectionName={collection?.name ?? ''} />
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-bold">{label}</div>
      <div className="mt-1 text-lg">{value}</div>
    </div>
  );
}

function PcMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-bg p-5">
      <div className="text-[13px] text-textSubPc">{label}</div>
      <div className="num pc-price mt-2 text-[24px] font-semibold text-text">{value}</div>
    </div>
  );
}

function NftItemCard({ item, index, collectionName }: { item: NftItem; index: number; collectionName: string }) {
  return (
    <article className="overflow-hidden rounded-lg bg-bgSoft">
      <div className="relative aspect-square">
        <NftVisual name={collectionName || item.name} />
        <span className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#0d7f48] text-xs text-white">⊙</span>
        <div className="absolute inset-x-0 bottom-0 flex h-8 items-center bg-black/45 px-3 text-sm font-bold text-white">
          <span className="truncate">{item.name}</span>
          <Verified />
        </div>
      </div>
      <div className="flex items-center justify-between px-3 py-2 text-[15px] font-bold">
        <span>{Number(item.price).toFixed(index === 1 ? 1 : 4).replace(/\.?0+$/, '')} {item.coin}</span>
        <span>{item.tokenNo ?? `#${item.id}`}</span>
      </div>
    </article>
  );
}
