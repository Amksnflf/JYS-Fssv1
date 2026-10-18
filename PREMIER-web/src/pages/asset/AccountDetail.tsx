import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, FileText, Search, Timer } from 'lucide-react';
import {
  fetchCoinListCached,
  getCoinListCacheSnapshot,
  type AccountVO,
  type CoinInfo,
} from '@/api/asset';
import {
  AssetActions,
  AssetHeader,
  CoinIcon,
  DETAIL_COINS,
  SectionHeading,
  TotalBlock,
  formatUsd,
} from './assetShared';
import { useResponsive } from '@/hooks/useResponsive';
import {
  PcAssetActionButton,
  PcAssetAmount,
  PcAssetLayout,
  PcAssetTitle,
} from './PcAssetLayout';
import { useAssetOverview } from '@/hooks/useAssetOverview';

const ACCOUNT_META: Record<number, { titleKey: string; coins: string[]; variant: 'spot' | 'trade' | 'finance' }> = {
  1: { titleKey: 'asset.spotAcc', coins: ['USDT', 'BTC', 'ETH', 'TRX', 'BCH', 'XRP', 'LTC'], variant: 'spot' },
  2: { titleKey: 'asset.tradeAcc', coins: ['ETH', 'TRX', 'BCH', 'XRP'], variant: 'trade' },
  3: { titleKey: 'asset.financeAcc', coins: ['USDT', 'BTC', 'ETH', 'TRX'], variant: 'finance' },
};

export default function AccountDetailPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { isPc } = useResponsive();
  const { type } = useParams();
  const accountType = Number(type || 1);
  const meta = ACCOUNT_META[accountType] ?? ACCOUNT_META[1];
  const { overview: data } = useAssetOverview();
  const [coins, setCoins] = useState<CoinInfo[]>(() => getCoinListCacheSnapshot() ?? []);
  // 隐藏小额资产：首次进入默认隐藏（默认勾选），并持久化记忆
  const [hideSmall, setHideSmall] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('coinex_assets_hide_small');
      if (saved !== null) return saved === 'true';
    }
    return true; // 首次进入默认隐藏 (默认勾选)
  });

  const toggleHideSmall = (checked: boolean) => {
    setHideSmall(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('coinex_assets_hide_small', String(checked));
    }
  };

  useEffect(() => {
    fetchCoinListCached().then((rows) => setCoins(rows ?? [])).catch(() => {});
  }, []);

  const accountRows = useMemo(() => {
    const byCoin = new Map(
      (data?.accounts ?? [])
        .filter((row) => row.accountType === accountType)
        .map((row) => [row.coin, row])
    );
    const actualCoins = (data?.accounts ?? [])
      .filter((row) => row.accountType === accountType)
      .map((row) => row.coin);
    const allCoins = Array.from(new Set([...meta.coins, ...coins.map((coin) => coin.code), ...actualCoins]));
    return allCoins
      .map((coin) => byCoin.get(coin) ?? zeroRow(accountType, coin))
      .filter((row) => !hideSmall || Number(row.valuation) > 1)
      .sort((a, b) => {
        // 有金额的排在前面
        const aHasBalance = Number(a.available) > 0;
        const bHasBalance = Number(b.available) > 0;
        if (aHasBalance && !bHasBalance) return -1;
        if (!aHasBalance && bHasBalance) return 1;
        // 如果都有金额或都没有金额，按估值降序排序
        return Number(b.valuation) - Number(a.valuation);
      });
  }, [accountType, coins, data, hideSmall, meta.coins]);
  const coinLogoMap = useMemo(
    () => new Map(coins.map((item) => [item.code, item.logo ?? null])),
    [coins]
  );

  const total = accountType === 1 ? data?.spotTotalUsd : accountType === 2 ? data?.tradeTotalUsd : data?.financeTotalUsd;

  if (isPc) {
    const active = accountType === 1 ? 'spot' : accountType === 2 ? 'trade' : 'finance';
    return (
      <PcAssetLayout active={active}>
        <section className="w-full">
          <div className="flex items-start justify-between">
            <div>
              <PcAssetTitle title={t('asset.accountEstimate', { account: t(meta.titleKey) })} />
              <PcAssetAmount value={total ?? '0'} />
              <div className="mt-[22px] flex items-center gap-[14px]">
                {accountType === 1 && (
                  <>
                    <PcAssetActionButton onClick={() => nav('/assets/deposit')} icon={<ArrowDownToLine size={13} />}>{t('asset.deposit')}</PcAssetActionButton>
                    <PcAssetActionButton onClick={() => nav('/assets/transfer')} icon={<ArrowLeftRight size={13} />}>{t('asset.transfer')}</PcAssetActionButton>
                  </>
                )}
                {accountType === 2 && (
                  <>
                    <PcAssetActionButton active onClick={() => nav('/assets/deposit')} icon={<ArrowDownToLine size={13} />}>{t('asset.deposit')}</PcAssetActionButton>
                    <PcAssetActionButton onClick={() => nav('/assets/withdraw')} icon={<ArrowUpFromLine size={13} />}>{t('asset.withdraw')}</PcAssetActionButton>
                    <PcAssetActionButton onClick={() => nav('/assets/transfer')} icon={<ArrowLeftRight size={13} />}>{t('asset.transfer')}</PcAssetActionButton>
                  </>
                )}
                {accountType === 3 && (
                  <>
                    <PcAssetActionButton active icon={<FileText size={13} />}>{t('asset.defaultSubscribe')}</PcAssetActionButton>
                <PcAssetActionButton onClick={() => nav('/finance/orders')} icon={<FileText size={13} />}>{t('asset.tradeRecord')}</PcAssetActionButton>
                  </>
                )}
              </div>
            </div>
            {accountType === 1 && (
              <div className="h-[108px] w-[300px] rounded-[14px] bg-[#eaf2ff] p-[18px]">
                <div className="flex justify-between text-[13px] font-semibold text-text">
                  <span>{t('asset.todayPnlShort')}</span>
                  <span>{t('asset.pnl30d')}</span>
                </div>
                <div className="mt-[18px] flex justify-between text-[12px] text-text">
                  <div>
                    <div className="text-up">0 USDT</div>
                    <div className="mt-[6px]">≈0 USD</div>
                  </div>
                  <div className="text-right">
                    <div className="text-up">0 USDT</div>
                    <div className="mt-[6px]">≈0 USD</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <section className="mt-[40px]">
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-[15px] font-semibold text-text">{t('asset.crypto')}</h2>
              <div className="flex items-center gap-[18px] text-[12px] text-textSubPc">
                <label className="flex h-[28px] w-[178px] items-center gap-[6px] border-b border-line">
                  <Search size={13} />
                  <input className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-textSubPc" placeholder={t('asset.searchCoin')} />
                </label>
                <label className="flex items-center gap-[6px]">
                  <input type="checkbox" checked={hideSmall} onChange={(e) => toggleHideSmall(e.target.checked)} />
                  {t('asset.hideLtUsd')}
                </label>
              </div>
            </div>

            <div className="mt-[24px] grid grid-cols-[1.2fr_1fr_1fr_1.2fr] px-[16px] text-[12px] text-textSubPc">
              <span>{t('asset.coin')}</span>
              <span>{accountType === 3 ? t('asset.available') : t('asset.amount')}</span>
              <span>{t('asset.estimateRatio')}</span>
              <span className="text-right">{t('asset.operation')}</span>
            </div>
            <div className="mt-[12px]">
              {accountRows.map((row) => (
                <PcAccountRow
                  key={row.coin}
                  row={row}
                  accountType={accountType}
                  logo={coinLogoMap.get(row.coin)}
                />
              ))}
            </div>
          </section>
        </section>
      </PcAssetLayout>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-bg pb-20">
      <AssetHeader title={t(meta.titleKey)} onBack={() => nav('/assets')} />
      <main className="px-4 pt-7">
        <TotalBlock total={total ?? '0'} todayProfit={data?.todayProfit} compact />

        <div className="mt-8">
          <AssetActions variant={meta.variant} />
        </div>
      </main>

      {/* {accountType === 1 && (
        <Promo
          title={t('asset.fixedInvest')}
          text={t('asset.fixedInvestDesc')}
          cta={t('asset.learnMore')}
          icon={<Timer size={78} strokeWidth={1.4} />}
        />
      )}
      {accountType === 2 && (
        <Promo
          title={t('asset.defaultSubscribe')}
          text={t('asset.defaultSubscribeDesc')}
          cta={t('asset.enableDefaultSubscribe')}
          icon={<FileText size={82} strokeWidth={1.4} />}
        />
      )} */}

      <section className="px-4 pt-8">
        <SectionHeading
          right={
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hideSmall} onChange={(e) => toggleHideSmall(e.target.checked)} />
              {t('asset.hideSmall')}
            </label>
          }
        >
          {t('asset.overview')}
        </SectionHeading>

        <div className="mt-6 grid grid-cols-3 text-sm text-textSub">
          <span>{t('asset.coin')}</span>
          <span className="text-center">{t('asset.available')}</span>
          <span className="text-right">{t('asset.profitAmount')}</span>
        </div>
        <div className="mt-4">
          {accountRows.map((row) => (
            <AccountRow
              key={row.coin}
              row={row}
              showProfit={accountType !== 2}
              logo={coinLogoMap.get(row.coin)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function Promo({ title, text, cta, icon }: { title: string; text: string; cta: string; icon: React.ReactNode }) {
  return (
    <section className="mt-8 border-y border-line px-8 py-8">
      <div className="text-sm text-textSub">{title}</div>
      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="text-base font-bold leading-7">
          {text}
          <div className="mt-2">{cta}</div>
        </div>
        <div className="shrink-0 text-textSub">{icon}</div>
      </div>
    </section>
  );
}

function AccountRow({
  row,
  showProfit,
  logo,
}: {
  row: AccountVO;
  showProfit: boolean;
  logo?: string | null;
}) {
  return (
    <div className="grid grid-cols-3 items-center py-5">
      <div className="flex items-center gap-4">
        <CoinIcon coin={row.coin} logo={logo} />
        <span className="text-lg font-medium">{row.coin}</span>
      </div>
      <div className="num text-center">
        <div className="text-lg font-semibold">{formatCoinAmount(row.available, row.coin)}</div>
        <div className="text-base text-textSub">${formatUsd(row.valuation)}</div>
      </div>
      <div className="num text-right text-textSub">
        <div>--</div>
        <div>{showProfit ? '--' : ''}</div>
      </div>
    </div>
  );
}

function PcAccountRow({
  row,
  accountType,
  logo,
}: {
  row: AccountVO;
  accountType: number;
  logo?: string | null;
}) {
  const { t } = useTranslation();
  const nav = useNavigate();
  return (
    <div className="grid min-h-[50px] grid-cols-[1.2fr_1fr_1fr_1.2fr] items-center px-[16px] py-[8px] text-[13px] text-text">
      <div className="flex items-center gap-[12px]">
        <CoinIcon coin={row.coin} logo={logo} size={26} />
        <div>
          <div className="font-semibold">{row.coin}</div>
          <div className="text-[10px] text-textSubPc">{coinFullName(row.coin)}</div>
        </div>
      </div>
      <div className="num pc-price">
        <div>{formatCoinAmount(row.available, row.coin)}</div>
        <div className="text-[10px] text-textSubPc">$ {formatUsd(row.valuation, 6)}</div>
      </div>
      <div className="flex items-center gap-[10px]">
        <span className="num pc-price">0.00 %</span>
        <span className="h-[18px] w-[18px] rounded-full border border-line" />
      </div>
      <div className="flex justify-end gap-[10px]">
        {accountType === 3 ? (
          <button onClick={() => nav(`/assets/transfer?coin=${row.coin}`)} className="h-[24px] min-w-[62px] rounded-[12px] bg-text px-[12px] text-[12px] font-semibold text-white">{t('asset.transfer')}</button>
        ) : (
          <>
            <button onClick={() => nav('/finance/ai/rules')} className="h-[24px] min-w-[70px] rounded-[12px] bg-text px-[12px] text-[12px] font-semibold text-white">{t('asset.recurringManage')}</button>
            <button onClick={() => nav('/finance')} className="h-[24px] min-w-[58px] rounded-[12px] bg-text px-[12px] text-[12px] font-semibold text-white">{t('asset.earn')}</button>
          </>
        )}
      </div>
    </div>
  );
}

function zeroRow(accountType: number, coin: string): AccountVO {
  return { accountType, coin, available: '0', frozen: '0', valuation: '0', price: '0' };
}

function coinFullName(coin: string) {
  const map: Record<string, string> = {
    USDT: 'Tether',
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    TRX: 'TRON',
    BCH: 'Bitcoin Cash',
    XRP: 'Ripple',
    LTC: 'LTC',
  };
  return map[coin] ?? coin;
}


function formatCoinAmount(value: string, coin: string) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
