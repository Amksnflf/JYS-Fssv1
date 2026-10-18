import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pause } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  fetchCoinListCached,
  getCoinListCacheSnapshot,
  transfer,
  type CoinInfo,
} from '@/api/asset';
import { toast } from '@/components/Toast';
import { AsterSelect } from '@/components/AsterUI';
import { AssetHeader, CoinIcon } from './assetShared';
import { useResponsive } from '@/hooks/useResponsive';
import { useAssetOverview } from '@/hooks/useAssetOverview';
import { PcAssetEmpty, PcAssetLayout } from './PcAssetLayout';
import { brandName } from '@/brand';

const ACCOUNTS = [
  { value: 1, labelKey: 'asset.spotAcc' },
  { value: 2, labelKey: 'asset.tradeAcc' },
  { value: 3, labelKey: 'asset.financeAcc' },
];

export default function TransferPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const { isPc } = useResponsive();
  const [coins, setCoins] = useState<CoinInfo[]>(() => getCoinListCacheSnapshot() ?? []);
  const { overview, refresh: refreshOverview } = useAssetOverview();
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(2);
  const [coin, setCoin] = useState(searchParams.get('coin')?.toUpperCase() || 'USDT');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCoinListCached().then((rows) => setCoins(rows ?? [])).catch(() => {});
  }, []);

  const fromAvailable = useMemo(() => {
    return overview?.accounts.find((item) => item.accountType === from && item.coin === coin)?.available ?? '0';
  }, [coin, from, overview]);
  const coinLogoMap = useMemo(
    () => new Map(coins.map((item) => [item.code, item.logo ?? null])),
    [coins]
  );

  const switchDirection = () => {
    setFrom(to);
    setTo(from);
    setAmount('');
  };

  const submit = async () => {
    if (from === to) {
      toast.error(t('asset.sourceTargetSame'));
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error(t('asset.transferAmountRequired'));
      return;
    }
    setLoading(true);
    try {
      await transfer(from, to, coin, amount);
      toast.success(t('asset.transferDone'));
      setAmount('');
      void refreshOverview(true).catch(() => undefined);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('asset.transferFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (isPc) {
    return (
      <PcAssetLayout active="transfer">
        <section className="w-full max-w-[800px]">
          <h1 className="mb-[24px] text-[18px] font-semibold text-text">{t('asset.transfer')}</h1>
          <div className="grid grid-cols-[360px_400px] gap-[32px]">
            <div>
              <div className="mb-[14px]">
                <AsterSelect
                  value={coin}
                  onChange={(value) => setCoin(String(value))}
                  options={coins.map((item) => ({ value: item.code, label: item.code }))}
                  triggerClassName="h-[40px] rounded-[20px] border border-line bg-bgSection px-5"
                  renderValue={(selected) => (
                    <span className="flex items-center">
                      <CoinIcon
                        coin={String(selected?.value ?? coin)}
                        logo={coinLogoMap.get(String(selected?.value ?? coin))}
                        size={22}
                      />
                      <span className="ml-auto text-[13px] font-semibold">{selected?.label ?? coin}</span>
                    </span>
                  )}
                />
              </div>
              <div className="grid grid-cols-[1fr_34px_1fr] items-center gap-[10px]">
                <PcAccountSelect label={t('asset.transferFrom')} value={from} onChange={setFrom} disabledValue={to} />
                <button
                  onClick={switchDirection}
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-bgSection text-text"
                  aria-label={t('asset.switchAccounts')}
                >
                  <Pause size={18} className="rotate-90 fill-text" />
                </button>
                <PcAccountSelect label={t('asset.transferTo')} value={to} onChange={setTo} disabledValue={from} />
              </div>

              <div className="mt-[14px] flex h-[40px] items-center rounded-[20px] border border-line px-[16px]">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t('asset.transferAmount')}
                  inputMode="decimal"
                  className="num min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-textSubPc"
                />
                <button onClick={() => setAmount(fromAvailable)} className="text-[12px] font-semibold text-primary">
                  {t('asset.transferAllAmount')}
                </button>
                <CoinIcon coin={coin} logo={coinLogoMap.get(coin)} size={18} />
              </div>
              <div className="mt-[12px] text-[12px] font-medium text-text">
                {t('asset.available')} <span className="num pc-price">{formatAmount(fromAvailable)}</span> {coin}
              </div>
              <button disabled={loading} onClick={submit} className="mt-[30px] h-[36px] w-full rounded-[18px] bg-text text-[14px] font-semibold text-white disabled:opacity-60">
                {t('asset.confirmTransfer')}
              </button>
            </div>

            <div className="h-[220px] overflow-hidden rounded-md bg-[#101114] p-[34px] text-white">
              <div className="flex h-full items-center justify-center rounded-md border border-white/10 bg-[#1b1d20]">
                <div className="text-center">
                  <div className="mx-auto flex h-[70px] w-[70px] items-center justify-center rounded-full bg-[#e5b87a] text-[30px] font-black text-white">✦</div>
          <div className="mt-[18px] text-[28px] font-semibold">{brandName}</div>
                </div>
              </div>
            </div>
          </div>

          <section className="mt-[26px]">
            <h2 className="mb-[20px] text-[15px] font-semibold text-text">{t('asset.historyTransfer')}</h2>
            <div className="grid grid-cols-5 px-[14px] text-[12px] text-text">
              <span>{t('asset.occurrenceTime')}</span>
              <span>{t('asset.coin')}</span>
              <span>{t('asset.quantity')}</span>
              <span>{t('asset.transferFrom')}</span>
              <span className="text-right">{t('asset.transferTo')}</span>
            </div>
            <PcAssetEmpty label={t('common.noData')} />
          </section>
        </section>
      </PcAssetLayout>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-bg pb-8">
      <AssetHeader title={t('asset.transfer')} onBack={() => nav('/assets')} />

      <main className="px-4 pt-8">
        <section className="relative">
          <AccountSelect label={t('asset.transferFrom')} value={from} onChange={setFrom} disabledValue={to} />
          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute inset-x-6 top-1/2 border-t border-dashed border-text" />
            <button
              onClick={switchDirection}
              className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-text text-bg"
              aria-label={t('asset.switchAccounts')}
            >
              <Pause size={24} className="rotate-90 fill-bg" />
            </button>
          </div>
          <AccountSelect label={t('asset.transferTo')} value={to} onChange={setTo} disabledValue={from} />
        </section>

        <section className="mt-10">
          <div className="mb-4 text-sm font-semibold">{t('asset.coin')}</div>
          <AsterSelect
            value={coin}
            onChange={(value) => setCoin(String(value))}
            options={coins.map((item) => ({ value: item.code, label: item.code }))}
            triggerClassName="h-[68px] rounded-lg border border-line bg-bg px-5"
            renderValue={(selected) => (
              <span className="flex items-center">
                <CoinIcon
                  coin={String(selected?.value ?? coin)}
                  logo={coinLogoMap.get(String(selected?.value ?? coin))}
                  size={42}
                />
                <span className="ml-4 text-lg font-bold">{selected?.label ?? coin}</span>
              </span>
            )}
          />
        </section>

        <section className="mt-8">
          <div className="mb-4 text-sm font-semibold">{t('asset.amount')}</div>
          <div className="flex h-[68px] items-center rounded-lg border border-line px-5">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t('asset.transferAmount')}
              inputMode="decimal"
              className="num min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-textSub"
            />
            <button onClick={() => setAmount(fromAvailable)} className="text-sm font-semibold text-[#2F7D32]">
              {t('asset.transferAllAmount')}
            </button>
          </div>
          <div className="mt-4 text-sm font-bold">
            {t('asset.maxTransfer')} <span className="num">{formatAmount(fromAvailable)}</span> {coin}
          </div>
        </section>

        <div className="mt-14 text-center text-sm font-semibold">{t('asset.buyCrypto')}</div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-bg px-6 pb-safe pt-4">
        <button disabled={loading} onClick={submit} className="btn-primary w-full disabled:opacity-60">
          {t('asset.confirmTransfer')}
        </button>
      </footer>
    </div>
  );
}

function AccountSelect({
  label,
  value,
  onChange,
  disabledValue,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabledValue: number;
}) {
  const { t } = useTranslation();
  const current = ACCOUNTS.find((item) => item.value === value) ?? ACCOUNTS[0];
  return (
    <AsterSelect
      value={value}
      onChange={(next) => onChange(Number(next))}
      options={ACCOUNTS.map((item) => ({
        value: item.value,
        label: t(item.labelKey),
        disabled: item.value === disabledValue,
      }))}
      triggerClassName="h-[68px] rounded-full border border-line bg-bg px-8"
      renderValue={() => (
        <span className="flex w-full items-center">
          <span className="text-xl text-textSub">{label}</span>
          <span className="ml-auto text-lg font-semibold">{t(current.labelKey)}</span>
        </span>
      )}
    />
  );
}

function PcAccountSelect({
  label,
  value,
  onChange,
  disabledValue,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabledValue: number;
}) {
  const { t } = useTranslation();
  const current = ACCOUNTS.find((item) => item.value === value) ?? ACCOUNTS[0];
  return (
    <AsterSelect
      value={value}
      onChange={(next) => onChange(Number(next))}
      options={ACCOUNTS.map((item) => ({
        value: item.value,
        label: t(item.labelKey),
        disabled: item.value === disabledValue,
      }))}
      triggerClassName="h-[40px] rounded-[20px] border border-line bg-bgSection px-4"
      renderValue={() => (
        <span className="flex w-full items-center text-[12px]">
          <span className="text-textSubPc">{label}</span>
          <span className="ml-auto font-semibold text-text">{t(current.labelKey)}</span>
        </span>
      )}
    />
  );
}

function formatAmount(value: string) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '0';
  return n.toFixed(8).replace(/\.?0+$/, '') || '0';
}
