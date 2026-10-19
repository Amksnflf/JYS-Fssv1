import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { toast } from '@/components/Toast';
import { AsterSelect } from '@/components/AsterUI';
import { ApiError } from '@/api/http';
import { useUserStore } from '@/store/userStore';
import {
  addAddress,
  fetchAddresses,
  fetchCoinListCached,
  fetchDepositAddress,
  fetchWithdrawOrders,
  getCoinListCacheSnapshot,
  submitWithdraw,
  type AddressItem,
  type CoinInfo,
  type DepositAddress,
  type WithdrawOrder,
} from '@/api/asset';
import { useAssetOverview } from '@/hooks/useAssetOverview';

const STATUS_LABEL: Record<number, string> = {
  0: 'asset.statusPending',
  1: 'asset.statusProcessing',
  2: 'asset.statusSuccess',
  3: 'asset.statusRejected',
};

export default function WithdrawPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const coinParam = searchParams.get('coin')?.trim().toUpperCase();
  const user = useUserStore((s) => s.user);
  const refreshUser = useUserStore((s) => s.refresh);
  const [coins, setCoins] = useState<CoinInfo[]>(
    () => (getCoinListCacheSnapshot() ?? []).filter((item) => item.withdrawEnabled === 1)
  );
  const [depositChains, setDepositChains] = useState<DepositAddress[]>([]);
  const [addressList, setAddressList] = useState<AddressItem[]>([]);
  const [coin, setCoin] = useState(() => coinParam || 'USDT');
  const [chain, setChain] = useState('');
  const [amount, setAmount] = useState('');
  const [addr, setAddr] = useState('');
  const [memo, setMemo] = useState('');
  const [pwd, setPwd] = useState('');
  const [available, setAvailable] = useState('0');
  const [orders, setOrders] = useState<WithdrawOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const { overview, refresh: refreshOverview } = useAssetOverview();

  useEffect(() => {
    if (coinParam && coinParam !== coin) {
      setCoin(coinParam);
    }
  }, [coinParam]);

  useEffect(() => {
    fetchCoinListCached()
      .then((d) => setCoins((d ?? []).filter((c) => c.withdrawEnabled === 1)))
      .catch(() => undefined);
    if (!user) refreshUser();
    loadOrders();
  }, [refreshUser, user]);

  useEffect(() => {
    const acc = overview?.accounts.find(
      (a) => a.accountType === 1 && a.coin === coin
    );
    setAvailable(acc?.available ?? '0');
  }, [coin, overview]);

  const selected = useMemo(() => coins.find((c) => c.code === coin), [coins, coin]);

  useEffect(() => {
    fetchDepositAddress(coin)
      .then((rows) => {
        const list = rows ?? [];
        setDepositChains(list);
        if (list.length > 0) {
          setChain((prev) => (list.some((r) => r.chain === prev) ? prev : list[0].chain));
        } else if (selected) {
          setChain(selected.chain ?? '');
        }
      })
      .catch(() => {
        setDepositChains([]);
        if (selected) setChain(selected.chain ?? '');
      });
  }, [coin, selected]);

  useEffect(() => {
    fetchAddresses(coin)
      .then((rows) => setAddressList(rows ?? []))
      .catch(() => setAddressList([]));
  }, [coin]);

  const loadOrders = () => {
    fetchWithdrawOrders(1, 10).then((d) => setOrders(d?.records ?? [])).catch(() => undefined);
  };

  const addressOptions = useMemo(
    () => addressList.filter((item) => !chain || item.chain === chain),
    [addressList, chain]
  );

  const selectedAddress = useMemo(
    () => addressOptions.find((item) => item.address === addr.trim()),
    [addr, addressOptions]
  );

  const onSubmit = async () => {
    const trimmedAddr = addr.trim();
    if (!trimmedAddr) return toast.error(t('asset.addressPlaceholder'));
    if (!amount || Number(amount) <= 0) return toast.error(t('asset.amountPlaceholder'));
    if (!user?.payPwdSet) return toast.error(t('asset.payPwdNotSet'));
    if (!pwd.trim()) return toast.error(t('asset.payPwdPlaceholder'));
    setLoading(true);
    try {
      const existsInCurrentChain = addressList.some(
        (item) => item.address === trimmedAddr && item.chain === chain
      );
      if (!existsInCurrentChain) {
        try {
          await addAddress({
            coin,
            chain,
            address: trimmedAddr,
            memo: selectedAddress?.memo || memo || undefined,
            remark: `${coin}-${chain}`,
          });
          fetchAddresses(coin)
            .then((rows) => setAddressList(rows ?? []))
            .catch(() => undefined);
        } catch {
          // 忽略自动同步地址簿失败，继续提交提币
        }
      }
      await submitWithdraw({
        coin,
        chain,
        amount: typeof amount === 'string' ? amount.trim() : amount,
        toAddress: trimmedAddr,
        memo: selectedAddress?.memo || memo,
        payPassword: pwd.trim(),
      });
      toast.success(t('common.submit'));
      setAmount('');
      setAddr('');
      setMemo('');
      setPwd('');
      loadOrders();
      void refreshOverview(true).catch(() => undefined);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'fail');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-8">
      <PageHeader title={t('asset.withdraw')} fallbackPath="/assets" />
      <div className="px-4 pt-4 md:px-6 md:max-w-[640px] md:mx-auto">
        <Field label={t('asset.selectCoin')}>
          <AsterSelect
            value={coin}
            onChange={(value) => setCoin(String(value))}
            options={coins.map((c) => ({ value: c.code, label: `${c.code} - ${c.name}` }))}
            triggerClassName="h-11"
          />
        </Field>

        <Field label={t('asset.selectChain')}>
          {depositChains.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {depositChains.map((item) => (
                <button
                  key={item.chain}
                  type="button"
                  onClick={() => setChain(item.chain)}
                  className={`h-9 rounded px-3 text-xs ${
                    chain === item.chain ? 'bg-text text-white' : 'bg-bgSoft text-textSub'
                  }`}
                >
                  {item.chain}
                </button>
              ))}
            </div>
          ) : (
            <input
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              className="h-11 w-full rounded-lg bg-bgSoft px-3 text-sm outline-none"
            />
          )}
        </Field>

        <Field label={t('asset.address')}>
          <input
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            placeholder={t('asset.addressPlaceholder')}
            className="h-11 w-full rounded-lg bg-bgSoft px-3 text-sm outline-none num"
          />
          {addressOptions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {addressOptions.map((item) => {
                const active = addr.trim() === item.address;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setAddr(item.address);
                      setMemo(item.memo ?? '');
                    }}
                    className={`rounded-md border px-2.5 py-1 text-[11px] transition-colors ${
                      active
                        ? 'border-text bg-text text-white'
                        : 'border-line bg-bgSoft text-textSub hover:border-text/40'
                    }`}
                  >
                    {item.remark || item.chain} · {item.address.slice(0, 6)}...{item.address.slice(-4)}
                  </button>
                );
              })}
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-textSub">
            <span>{t('asset.addressPlaceholder')}</span>
            <Link to="/assets/address" className="font-medium text-text underline underline-offset-2">
              {t('asset.goAddressBook')}
            </Link>
          </div>
        </Field>

        <Field
          label={`${t('asset.amount')} (${t('asset.available')} ${available} ${coin})`}
        >
          <div className="relative">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t('asset.amountPlaceholder')}
              inputMode="decimal"
              className="w-full h-11 bg-bgSoft rounded-lg px-3 pr-16 text-sm outline-none num"
            />
            <button
              type="button"
              onClick={() => setAmount(available)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text font-medium"
            >
              {t('asset.transferAll')}
            </button>
          </div>
          {selected && (
            <div className="mt-2 text-[11px] text-textSub">
              {t('asset.minWithdraw')}: {selected.minWithdraw} · {t('asset.fee')}:{' '}
              {selected.withdrawFee} {coin}
            </div>
          )}
        </Field>

        <Field label={t('asset.payPwd')}>
          {!user?.payPwdSet && (
            <div className="mb-2 flex items-center justify-between gap-3 rounded-lg bg-[#FFF7E8] px-3 py-2 text-xs text-[#9A5A00]">
              <span>{t('asset.payPwdNotSet')}</span>
              <Link to="/profile/security?modal=pay_pwd" className="shrink-0 font-semibold underline underline-offset-2">
                {t('asset.setPayPwdNow')}
              </Link>
            </div>
          )}
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder={t('asset.payPwdPlaceholder')}
            className="w-full h-11 bg-bgSoft rounded-lg px-3 text-sm outline-none"
          />
        </Field>

        <button
          disabled={loading}
          onClick={onSubmit}
          className="mt-6 w-full h-11 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {t('asset.submit')}
        </button>

        <h3 className="mt-8 mb-3 text-sm font-semibold">{t('asset.historyWithdraw')}</h3>
        {orders.length === 0 ? (
          <div className="py-8 text-center text-sm text-textSub">{t('common.noData')}</div>
        ) : (
          <ul className="space-y-2">
            {orders.map((o) => (
              <li
                key={o.id}
                className="border border-line rounded-lg p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium num">
                    -{o.amount} {o.coin}
                  </span>
                  <StatusTag status={o.status} />
                </div>
                <div className="mt-1 text-textSub">
                  {o.chain} · {t('asset.fee')} {o.fee} · {o.createdAt}
                </div>
                <div className="mt-1 text-textSub break-all num">{o.toAddress}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-xs text-textSub mb-2">{label}</div>
      {children}
    </div>
  );
}

function StatusTag({ status }: { status: number }) {
  const { t } = useTranslation();
  const cls =
    status === 2
      ? 'bg-upBg text-up'
      : status === 3
      ? 'bg-downBg text-down'
      : 'bg-bgSoft text-textSub';
  const label = STATUS_LABEL[status] ?? 'asset.statusPending';
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] ${cls}`}>{t(label)}</span>
  );
}
