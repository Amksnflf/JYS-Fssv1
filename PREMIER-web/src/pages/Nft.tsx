import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BarChart3, CheckCircle2, Layers3, Play, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { fetchNftCollections, fetchNftIncomes, fetchNftStats, type NftCollection, type NftIncome, type NftStats } from '@/api/nft';
import { EmptyState } from '@/components/AsterUI';
import { collectionTheme, formatCompactCount, mergeCollections } from '@/data/nftDisplay';
import { useResponsive } from '@/hooks/useResponsive';
import { PcContainer } from '@/components/pc';

export default function NftPage() {
  const { t } = useTranslation();
  const { isPc } = useResponsive();
  const [collections, setCollections] = useState<NftCollection[]>([]);
  const [stats, setStats] = useState<NftStats | null>(null);
  const [incomes, setIncomes] = useState<NftIncome[]>([]);
  const [videoOpen, setVideoOpen] = useState(false);

  useEffect(() => {
    fetchNftCollections()
      .then((rows) => setCollections(mergeCollections(rows ?? [])))
      .catch(() => setCollections(mergeCollections([])));
    fetchNftStats().then(setStats).catch(() => setStats(null));
    fetchNftIncomes(10).then((rows) => setIncomes(rows ?? [])).catch(() => setIncomes([]));
  }, []);

  const hot = useMemo(() => collections.filter((item) => item.isHot).slice(0, 6), [collections]);
  const art = useMemo(() => collections.filter((item) => !item.isHot).slice(0, 8), [collections]);

  if (isPc) {
    return (
      <div className="bg-bg py-12 text-text">
        <PcContainer>
          <section className="relative overflow-hidden rounded-lg bg-black">
            <img src="/assets/target-video-bg.e84f03e0.png" alt="" className="h-[360px] w-full object-cover" />
            <button
              className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white shadow-pop"
              aria-label="play"
              onClick={() => setVideoOpen(true)}
            >
              <Play size={36} fill="currentColor" />
            </button>
          </section>

          <div className="mt-8 grid grid-cols-4 gap-4">
            <PcStatPill icon={<BarChart3 size={22} />} label={t('nft.tradingCount')} value={formatNumber(stats?.nftTradingNumber)} />
            <PcStatPill icon={<BarChart3 size={22} />} label={t('nft.tradingVolume')} value={formatNumber(stats?.nftTradingVolume)} />
            <PcStatPill icon={<Layers3 size={22} />} label={t('nft.nftCount')} value={formatNumber(stats?.nftNFTNumber)} />
            <PcStatPill icon={<Users size={22} />} label={t('nft.beneficiaryCount')} value={formatNumber(stats?.nftNumOfBeneficiaries)} />
          </div>

          <PcCollectionSection title="Hot" rows={hot} />
          <PcCollectionSection title="ART" rows={art} />

          <section className="mt-12">
            <h2 className="pc-h3 m-0">{t('nft.incomeOutput')}</h2>
            <div className="mt-6 rounded-lg border border-line bg-bg">
              <div className="grid grid-cols-[2fr_1fr_1fr] border-b border-line bg-bgSection px-6 py-3 text-[13px] font-medium text-textSubPc">
                <span>{t('nft.userAddress')}</span>
                <span>{t('nft.nftName')}</span>
                <span className="text-right">{t('nft.income')}</span>
              </div>
              <div>
                {incomes.map((row) => (
                  <div key={`${row.address}-${row.tokenNo}`} className="grid grid-cols-[2fr_1fr_1fr] items-center border-t border-line px-6 py-3 text-[14px] text-text first:border-t-0">
                    <span className="truncate font-medium">{row.address}</span>
                    <span className="text-textSubPc">{row.tokenNo}</span>
                    <span className="num pc-price text-right text-text">
                      {Number(row.income).toFixed(2)}<span className="ml-1 text-primary">₮</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </PcContainer>

        {videoOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <button className="absolute inset-0" aria-label="close video" onClick={() => setVideoOpen(false)} />
            {stats?.nftVideoLiveUrl1 ? (
              <video className="relative z-10 w-[800px] max-w-full" controls autoPlay playsInline src={stats.nftVideoLiveUrl1} />
            ) : (
              <div className="relative z-10 w-[420px] rounded-lg bg-bg p-8 text-center text-[14px] text-text">{t('nft.noVideo')}</div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg md:bg-[#3c3c3c] md:py-6">
      <div className="mx-auto min-h-screen w-full max-w-md bg-bg pb-8">
        <PageHeader title="NFT" fallbackPath="/" />

        <main className="px-4 pt-4">
          <section className="relative overflow-hidden rounded-lg bg-black">
            <img src="/assets/target-video-bg.e84f03e0.png" alt="" className="h-[188px] w-full object-cover" />
            <button
              className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#1c8d27] text-white shadow-lg"
              aria-label="play"
              onClick={() => setVideoOpen(true)}
            >
              <Play size={30} fill="currentColor" />
            </button>
          </section>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <StatPill icon={<BarChart3 size={23} />} label={t('nft.tradingCount')} value={formatNumber(stats?.nftTradingNumber)} color="bg-[#22baf0]" />
            <StatPill icon={<BarChart3 size={23} />} label={t('nft.tradingVolume')} value={formatNumber(stats?.nftTradingVolume)} color="bg-primary" />
            <StatPill icon={<Layers3 size={23} />} label={t('nft.nftCount')} value={formatNumber(stats?.nftNFTNumber)} color="bg-[#df6846]" />
            <StatPill icon={<Users size={23} />} label={t('nft.beneficiaryCount')} value={formatNumber(stats?.nftNumOfBeneficiaries)} color="bg-[#58c77c]" />
          </div>

          <CollectionSection title="Hot" rows={hot} />
          <CollectionSection title="ART" rows={art} />

          <section className="mt-8">
            <SectionTitle>{t('nft.journey')}</SectionTitle>
            <EmptyState title={t('common.noData')} />
          </section>

          <section className="mt-8">
            <SectionTitle>{t('nft.incomeOutput')}</SectionTitle>
            <div className="mt-5 grid grid-cols-[1.3fr_1fr_.8fr] text-sm text-textSub">
              <span>{t('nft.userAddress')}</span>
              <span>{t('nft.nftName')}</span>
              <span className="text-right">{t('nft.income')}</span>
            </div>
            <div className="mt-3 divide-y divide-line">
              {incomes.map((row) => (
                <div key={`${row.address}-${row.tokenNo}`} className="grid grid-cols-[1.3fr_1fr_.8fr] py-3 text-[15px] font-bold">
                  <span className="truncate">{row.address}</span>
                  <span>{row.tokenNo}</span>
                  <span className="text-right">{Number(row.income).toFixed(2)}<span className="ml-0.5 text-[#2f7d32]">₮</span></span>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
      {videoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <button className="absolute inset-0" aria-label="close video" onClick={() => setVideoOpen(false)} />
          {stats?.nftVideoLiveUrl1 ? (
            <video className="relative z-10 w-full max-w-md" controls autoPlay playsInline src={stats.nftVideoLiveUrl1} />
          ) : (
            <div className="relative z-10 w-full max-w-md rounded-lg bg-bg p-5 text-center text-sm">
              {t('nft.noVideo')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CollectionSection({ title, rows }: { title: string; rows: NftCollection[] }) {
  return (
    <section className="mt-7">
      <div className="flex items-center justify-between">
        <SectionTitle>{title}</SectionTitle>
        <ArrowRight size={26} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
        {rows.map((item) => (
          <Link key={item.id} to={`/nft/collection/${item.id}`} className="block">
            <CollectionCard item={item} />
          </Link>
        ))}
      </div>
    </section>
  );
}

function CollectionCard({ item }: { item: NftCollection }) {
  const { t } = useTranslation();
  return (
    <article>
      <div className="relative aspect-square overflow-hidden rounded-lg">
        <NftVisual name={item.name} />
        <div className="absolute inset-x-0 bottom-0 flex h-8 items-center bg-black/45 px-3 text-sm font-bold text-white">
          <span className="truncate">{item.name}</span>
          <Verified />
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between px-2 text-[15px] font-bold">
        <span className="text-[#2f7d32]">₮ {Number(item.floorPrice).toFixed(Number(item.floorPrice) > 100 ? 2 : 4).replace(/\.?0+$/, '')}</span>
        <span>{t('nft.quantity', { value: formatCompactCount(item.itemCount) })}</span>
      </div>
    </article>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center text-[24px] font-bold leading-none">
      <span className="mr-2 inline-block h-3 w-3 rounded-sm bg-text shadow-[-5px_-5px_0_#d9d9d9]" />
      {children}
    </h2>
  );
}

export function Verified() {
  return <CheckCircle2 size={16} fill="white" className="ml-1 shrink-0 text-white" />;
}

export function NftVisual({ name, large = false }: { name: string; large?: boolean }) {
  const ape = name.toLowerCase().includes('ape') || name.toLowerCase().includes('alejandra');
  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden ${collectionTheme(name)}`}>
      {ape ? (
        <div className={`${large ? 'scale-[2.05]' : 'scale-100'} relative h-28 w-24`}>
          <div className="absolute left-3 top-9 h-8 w-5 rounded-full bg-[#d59b67]" />
          <div className="absolute right-3 top-9 h-8 w-5 rounded-full bg-[#d59b67]" />
          <div className="absolute left-5 top-2 h-20 w-14 rounded-[38%] bg-[#bf8152]" />
          <div className="absolute left-7 top-8 h-11 w-11 rounded-full bg-[#dca66c]" />
          <div className="absolute left-3 top-0 h-24 w-10 rounded-t-full bg-[#264f83]" />
          <div className="absolute left-2 top-2 h-5 w-14 rotate-[-8deg] rounded bg-[#ef6b76]" />
          <div className="absolute left-7 top-11 h-5 w-12 rounded bg-white shadow-[0_0_0_3px_#263040]" />
          <div className="absolute left-9 top-16 h-3 w-9 rounded-full bg-[#9a5c37]" />
          <div className="absolute left-5 top-[82px] h-12 w-16 rounded-t-2xl bg-[#1f2933]" />
        </div>
      ) : (
        <div className="px-4 text-center text-3xl font-black tracking-tight text-white">{name.replace(/\s+/g, '')}</div>
      )}
    </div>
  );
}

function StatPill({ icon, label, value, color }: { icon: ReactNode; label: string; value: string; color: string }) {
  return (
    <div className={`flex h-[74px] items-center gap-3 rounded-full p-2 text-white ${color}`}>
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[8px] border-white bg-white text-[#2f7d32]">{icon}</div>
      <div className="min-w-0">
        <div className="truncate text-xl font-bold leading-6">{value}</div>
        <div className="text-sm leading-4">{label}</div>
      </div>
    </div>
  );
}

function formatNumber(value: string | number | undefined) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function PcStatPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-bg px-5 py-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white">{icon}</span>
      <div className="min-w-0">
        <div className="num pc-price truncate text-[18px] font-semibold text-text">{value}</div>
        <div className="text-[13px] text-textSubPc">{label}</div>
      </div>
    </div>
  );
}

function PcCollectionSection({ title, rows }: { title: string; rows: NftCollection[] }) {
  return (
    <section className="mt-12">
      <div className="flex items-end justify-between">
        <h2 className="pc-h3 m-0">{title}</h2>
        <ArrowRight size={20} className="text-textSubPc" />
      </div>
      <div className="mt-6 grid grid-cols-4 gap-5">
        {rows.map((item) => (
          <Link key={item.id} to={`/nft/collection/${item.id}`} className="block transition hover:-translate-y-0.5">
            <article className="overflow-hidden rounded-lg border border-line bg-bg shadow-pcCard">
              <div className="relative aspect-square overflow-hidden">
                <NftVisual name={item.name} large />
                <div className="absolute inset-x-0 bottom-0 flex h-9 items-center bg-black/45 px-3 text-[14px] font-bold text-white">
                  <span className="truncate">{item.name}</span>
                  <Verified />
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-[14px] font-bold text-text">
                <span className="text-primary">₮ {Number(item.floorPrice).toFixed(Number(item.floorPrice) > 100 ? 2 : 4).replace(/\.?0+$/, '')}</span>
                <span className="text-textSubPc">x{formatCompactCount(item.itemCount)}</span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
