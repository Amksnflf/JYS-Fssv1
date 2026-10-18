import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownUp, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { toast } from '@/components/Toast';
import { AsterSelect, EmptyState } from '@/components/AsterUI';
import { useUserStore } from '@/store/userStore';
import { useWalletModal } from '@/hooks/useWalletModal';
import {
  fetchCoinListCached,
  getCoinListCacheSnapshot,
  type CoinInfo,
} from '@/api/asset';
import {
  fetchFlashHistory,
  fetchFlashQuote,
  submitFlashConvert,
  type AccountKind,
  type FlashOrder,
  type FlashQuoteVO,
} from '@/api/flash';
import { useAssetOverview } from '@/hooks/useAssetOverview';

const ACC_OPTIONS: { value: AccountKind; key: string; type: number }[] = [
  { value: 'spot', key: 'asset.spotAcc', type: 1 },
  { value: 'trade', key: 'asset.tradeAcc', type: 2 },
  { value: 'finance', key: 'asset.financeAcc', type: 3 },
];

const QUOTE_TTL_MS = 10_000;

export default function FlashPage() {
  const { t } = useTranslation();
  const token = useUserStore((s) => s.token);
  const { openWalletModal } = useWalletModal();
  const [searchParams] = useSearchParams();
  const initialFromCoin = searchParams.get('fromCoin')?.toUpperCase() || 'USDT';
  const initialToCoin = searchParams.get('toCoin')?.toUpperCase() || 'BTC';
  const [coins, setCoins] = useState<CoinInfo[]>(() => getCoinListCacheSnapshot() ?? []);
  const [fromCoin, setFromCoin] = useState(initialFromCoin);
  const [toCoin, setToCoin] = useState(initialToCoin);
  const [fromAccount, setFromAccount] = useState<AccountKind>('spot');
  const [toAccount, setToAccount] = useState<AccountKind>('spot');
  const [amount, setAmount] = useState('');
  const { overview, refresh: refreshOverview } = useAssetOverview();
  const [quote, setQuote] = useState<FlashQuoteVO | null>(null);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<FlashOrder[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!token) return;
    fetchCoinListCached().then((d) => setCoins(d ?? [])).catch(() => undefined);
    refreshHistory();
  }, [token]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const refreshHistory = () => {
    fetchFlashHistory(1, 10)
      .then((p) => setHistory(p?.records ?? []))
      .catch(() => undefined);
  };

  const fromAccountType = useMemo(
    () => ACC_OPTIONS.find((o) => o.value === fromAccount)!.type,
    [fromAccount]
  );
  const fromAvailable = useMemo(() => {
    const acc = overview?.accounts.find(
      (a) => a.accountType === fromAccountType && a.coin === fromCoin
    );
    return acc?.available ?? '0';
  }, [overview, fromAccountType, fromCoin]);

  // 取报价（防抖）
  useEffect(() => {
    setQuote(null);
    setQuoteErr(null);
    if (!amount || Number(amount) <= 0) return;
    if (fromCoin === toCoin) {
      setQuoteErr(t('flash.sameCoin'));
      return;
    }
    const handler = window.setTimeout(() => {
      fetchFlashQuote(fromCoin, toCoin, amount)
        .then((q) => setQuote(q))
        .catch((e: any) => setQuoteErr(e?.message ?? 'fail'));
    }, 400);
    return () => window.clearTimeout(handler);
  }, [fromCoin, toCoin, amount, t]);

  // 报价倒计时；过期自动重拉
  const quoteRemain = quote ? Math.max(0, QUOTE_TTL_MS - (now - quote.quoteTs)) : 0;
  useEffect(() => {
    if (!quote) return;
    if (quoteRemain > 0) return;
    if (!amount || Number(amount) <= 0) return;
    fetchFlashQuote(fromCoin, toCoin, amount)
      .then((q) => setQuote(q))
      .catch(() => undefined);
  }, [quoteRemain, quote, fromCoin, toCoin, amount]);

  const swapCoin = () => {
    setFromCoin(toCoin);
    setToCoin(fromCoin);
    setAmount('');
  };

  const onSubmit = async () => {
    if (!quote) return;
    if (Number(amount) > Number(fromAvailable)) {
      toast.error(t('flash.insufficient'));
      return;
    }
    setLoading(true);
    try {
      await submitFlashConvert(
        fromAccount,
        toAccount,
        fromCoin,
        toCoin,
        amount,
        quote?.toAmount,
        0.01,
      );
      toast.success(t('flash.success'));
      setAmount('');
      setQuote(null);
      void refreshOverview(true).catch(() => undefined);
      refreshHistory();
    } catch (e: any) {
      toast.error(e?.message ?? 'fail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) openWalletModal();
  }, [token, openWalletModal]);

  if (!token) return null;

  return (
    <div className="pb-24">
      <PageHeader title={t('flash.title')} fallbackPath="/assets" />
      <div className="mx-auto max-w-md px-4 pt-6 md:max-w-[640px] md:px-6">
        {/* From 区 */}
        <div className="rounded-2xl border border-line bg-bg p-4">
          <div className="flex items-center justify-between text-xs text-textSub">
            <span>{t('flash.from')}</span>
            <span>
              {t('asset.available')} {Number(fromAvailable).toFixed(6)} {fromCoin}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <AsterSelect
              value={fromAccount}
              onChange={(value) => setFromAccount(value as AccountKind)}
              options={ACC_OPTIONS.map((o) => ({ value: o.value, label: t(o.key) }))}
              className="w-[116px] shrink-0"
              triggerClassName="h-10 rounded-full text-xs"
            />
            <AsterSelect
              value={fromCoin}
              onChange={(value) => setFromCoin(String(value))}
              options={coins.map((c) => ({ value: c.code, label: c.code }))}
              className="min-w-0 flex-1"
              triggerClassName="h-10 rounded-full"
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              className="h-12 flex-1 rounded-lg bg-bgSoft px-3 font-mono text-base outline-none"
            />
            <button
              type="button"
              onClick={() => setAmount(fromAvailable)}
              className="text-xs font-medium text-primary"
            >
              {t('asset.transferAll')}
            </button>
          </div>
        </div>

        {/* swap 按钮 */}
        <div className="my-2 flex justify-center">
          <button
            onClick={swapCoin}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-bgSoft"
            aria-label="swap"
          >
            <ArrowDownUp size={18} />
          </button>
        </div>

        {/* To 区 */}
        <div className="rounded-2xl border border-line bg-bg p-4">
          <div className="flex items-center justify-between text-xs text-textSub">
            <span>{t('flash.to')}</span>
            <span>
              {t('asset.available')}{' '}
              {Number(
                overview?.accounts.find(
                  (a) =>
                    a.accountType === ACC_OPTIONS.find((o) => o.value === toAccount)!.type &&
                    a.coin === toCoin
                )?.available ?? '0'
              ).toFixed(6)}{' '}
              {toCoin}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <AsterSelect
              value={toAccount}
              onChange={(value) => setToAccount(value as AccountKind)}
              options={ACC_OPTIONS.map((o) => ({ value: o.value, label: t(o.key) }))}
              className="w-[116px] shrink-0"
              triggerClassName="h-10 rounded-full text-xs"
            />
            <AsterSelect
              value={toCoin}
              onChange={(value) => setToCoin(String(value))}
              options={coins.map((c) => ({ value: c.code, label: c.code }))}
              className="min-w-0 flex-1"
              triggerClassName="h-10 rounded-full"
            />
          </div>
          <div className="mt-2 h-12 rounded-lg bg-bgSoft px-3 font-mono text-base leading-[3rem] text-textSub">
            {quote ? Number(quote.toAmount).toFixed(8) : '--'}
          </div>
        </div>

        {/* 报价信息 */}
        {quote && (
          <div className="mt-3 space-y-1 rounded-lg border border-line p-3 text-xs">
            <Row label={t('flash.rate')}>
              1 {quote.fromCoin} ≈ {Number(quote.rate).toFixed(8)} {quote.toCoin}
            </Row>
            <Row label={t('flash.feeRate')}>{(Number(quote.feeRate) * 100).toFixed(2)}%</Row>
            <Row label={t('flash.refresh')}>
              <span className="inline-flex items-center gap-1 text-textSub">
                <RefreshCw size={12} />
                {Math.ceil(quoteRemain / 1000)}s
              </span>
            </Row>
          </div>
        )}

        {quoteErr && (
          <p className="mt-2 rounded bg-down/10 px-3 py-2 text-xs text-down">{quoteErr}</p>
        )}

        <button
          disabled={loading || !quote || !!quoteErr}
          onClick={onSubmit}
          className="btn-primary mt-8 w-full disabled:opacity-50"
        >
          {t('flash.confirm')}
        </button>

        {/* 历史 */}
        <h3 className="mt-8 mb-2 text-sm font-semibold">{t('flash.history')}</h3>
        {history.length === 0 ? (
          <EmptyState title={t('common.noData')} />
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded border border-line bg-bgSoft px-3 py-2 text-xs"
              >
                <div>
                  <div className="font-mono">
                    -{Number(h.fromAmount).toFixed(6)} {h.fromCoin}
                    <span className="mx-1 text-textSub">→</span>
                    <span className="text-up">
                      +{Number(h.toAmount).toFixed(6)} {h.toCoin}
                    </span>
                  </div>
                  <div className="text-textSub">
                    {new Date(h.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-right text-textSub">
                  {(Number(h.feeRate) * 100).toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-textSub">{label}</span>
      <span className="font-mono">{children}</span>
    </div>
  );
}
