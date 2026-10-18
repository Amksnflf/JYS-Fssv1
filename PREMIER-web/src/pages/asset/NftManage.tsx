import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { fetchMyNfts, type NftItem } from '@/api/nft';
import { AssetHeader, CoinIcon, NFT_COINS } from './assetShared';
import { useResponsive } from '@/hooks/useResponsive';
import { PcAssetEmpty, PcAssetLayout } from './PcAssetLayout';

type TabKey = 'nft' | 'mine' | 'list';

export default function NftManagePage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { isPc } = useResponsive();
  const [tab, setTab] = useState<TabKey>('nft');
  const [mine, setMine] = useState<NftItem[]>([]);

  useEffect(() => {
    fetchMyNfts(1, 30).then((page) => setMine(page?.records ?? [])).catch(() => setMine([]));
  }, []);

  if (isPc) {
    return (
      <PcAssetLayout active="nft">
        <section className="w-full">
          <div className="flex h-[36px] items-center gap-[42px] border-b border-line text-[14px]">
            <TabButton active={tab === 'nft'} onClick={() => setTab('nft')}>{t('asset.myCollections')}</TabButton>
            <TabButton active={tab === 'mine'} onClick={() => setTab('mine')}>{t('asset.nftLimitOrders')}</TabButton>
            <TabButton active={tab === 'list'} onClick={() => setTab('list')}>{t('asset.nftAuctionOrders')}</TabButton>
            <button className="h-full text-textSubPc">{t('asset.nftListedOrders')}</button>
          </div>
          {tab === 'nft' ? (
            <main className="pt-[32px]">
              <div className="grid grid-cols-[1fr_1fr] px-[16px] text-[12px] text-textSubPc">
                <span>{t('asset.coin')}</span>
                <span className="text-right">{t('asset.available')}</span>
              </div>
              <div className="mt-[14px]">
                {NFT_COINS.map((coin) => (
                  <div key={coin} className="grid grid-cols-[1fr_1fr] items-center px-[16px] py-[12px]">
                    <div className="flex items-center gap-[12px]">
                      <CoinIcon coin={coin} size={28} />
                      <span className="text-[14px] font-semibold">{coin}</span>
                    </div>
                    <div className="num pc-price text-right">
                      <div className="text-[14px] font-semibold">0</div>
                      <div className="text-[12px] text-textSubPc">$0.000000</div>
                    </div>
                  </div>
                ))}
              </div>
            </main>
          ) : mine.length === 0 ? (
            <PcAssetEmpty label={t('common.noData')} />
          ) : (
            <main className="grid grid-cols-4 gap-4 pt-[28px]">
              {mine.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-lg border border-line">
                  <img src={item.image} alt={item.name} className="aspect-square w-full object-cover" />
                  <div className="p-3 text-[13px] font-medium">{item.name}</div>
                </div>
              ))}
            </main>
          )}
        </section>
      </PcAssetLayout>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-bg">
      <AssetHeader title={t('asset.collectionManageTitle')} onBack={() => nav('/assets')} />

      <div className="grid h-[58px] grid-cols-3 border-b border-line text-base">
        <TabButton active={tab === 'nft'} onClick={() => setTab('nft')}>NFT</TabButton>
        <TabButton active={tab === 'mine'} onClick={() => setTab('mine')}>{t('asset.myCollections')}</TabButton>
        <TabButton active={tab === 'list'} onClick={() => setTab('list')}>{t('asset.listedCollection')}</TabButton>
      </div>

      {tab === 'nft' ? (
        <main className="px-6 pt-7">
          <div className="grid grid-cols-2 text-sm text-textSub">
            <span>{t('asset.coin')}</span>
            <span className="text-right">{t('asset.available')}</span>
          </div>
          <div className="mt-4">
            {NFT_COINS.map((coin) => (
              <div key={coin} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <CoinIcon coin={coin} />
                  <span className="text-lg font-medium">{coin}</span>
                </div>
                <div className="num text-right">
                  <div className="text-lg font-semibold">0</div>
                  <div className="text-lg text-textSub">$0.000000</div>
                </div>
              </div>
            ))}
          </div>
        </main>
      ) : (
        <main className="px-4 pt-8">
          {mine.length === 0 ? (
            <div className="py-16 text-center text-base font-semibold text-textSub">{t('common.noData')}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {mine.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-xl border border-line">
                  <img src={item.image} alt={item.name} className="aspect-square w-full object-cover" />
                  <div className="p-2 text-sm font-medium">{item.name}</div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="relative flex items-center justify-center">
      <span className={active ? 'text-text' : 'text-textSub'}>{children}</span>
      {active && <span className="absolute bottom-0 h-[2px] w-full bg-text" />}
    </button>
  );
}
