import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Copy, HelpCircle, Search, ShieldCheck, X } from 'lucide-react';
import { fetchTicks } from '@/api/quote';
import { toast } from '@/components/Toast';
import { AsterSelect, CoinLogo as AsterCoinLogo } from '@/components/AsterUI';
import {
  fetchCoinListCached,
  fetchDepositAddress,
  fetchDepositMode,
  fetchDepositOrder,
  fetchDepositOrders,
  getCoinListCacheSnapshot,
  createUdunDepositOrder,
  submitDeposit,
  type CoinInfo,
  type DepositAddress,
  type DepositMode,
  type DepositOrder,
} from '@/api/asset';

type DepositOption = {
  key: string;
  coin: string;
  chain: string;
  title: string;
  quoteSymbol?: string;
  rateLabelKey: string;
};

const DEPOSIT_OPTIONS: DepositOption[] = [
  /** USDT 与美元锚定，站内无 USDTUSDT 行情（AllTick 也不推送），汇率按 1 USD 展示 */
  { key: 'USDT-TRC20', coin: 'USDT', chain: 'TRC20', title: 'USDT-TRC20', rateLabelKey: 'asset.rate' },
  { key: 'ETH-ERC20', coin: 'ETH', chain: 'ERC20', title: 'ETH', quoteSymbol: 'ETHUSDT', rateLabelKey: 'asset.rate' },
  { key: 'BTC-BTC', coin: 'BTC', chain: 'BTC', title: 'BTC', quoteSymbol: 'BTCUSDT', rateLabelKey: 'asset.rate' },
  { key: 'USDT-ERC20', coin: 'USDT', chain: 'ERC20', title: 'USDT-ERC20', rateLabelKey: 'asset.rate' },
  { key: 'USDC-TRC20', coin: 'USDC', chain: 'TRC20', title: 'USDC', quoteSymbol: 'USDCUSDT', rateLabelKey: 'asset.rate' },
  { key: 'DAI-ERC20', coin: 'DAI', chain: 'ERC20', title: 'DAI', quoteSymbol: 'DAIUSDT', rateLabelKey: 'asset.rate' },
  { key: 'USDT-BEP20', coin: 'USDT', chain: 'BEP20', title: 'USDT-BEP20', rateLabelKey: 'asset.rate' },
  { key: 'SOL-SOL', coin: 'SOL', chain: 'SOL', title: 'SOL', quoteSymbol: 'SOLUSDT', rateLabelKey: 'asset.rate' },
  { key: 'DOGE-DOGE', coin: 'DOGE', chain: 'DOGE', title: 'DOGE', quoteSymbol: 'DOGEUSDT', rateLabelKey: 'asset.rate' },
  { key: 'LINK-ERC20', coin: 'LINK', chain: 'ERC20', title: 'LINK', quoteSymbol: 'LINKUSDT', rateLabelKey: 'asset.rate' },
];

const COIN_FULL_NAMES: Record<string, string> = {
  USDT: 'Tether USD',
  ETH: 'Ethereum',
  BTC: 'Bitcoin',
  USDC: 'USD Coin',
  DAI: 'Dai Stablecoin',
  SOL: 'Solana',
  DOGE: 'Dogecoin',
  LINK: 'Chainlink',
};

function getChainBadgeStyle(chain: string) {
  const c = chain.toUpperCase();
  if (c === 'TRC20') return 'bg-[#00C4DF]/10 text-[#009CB0] border-[#00C4DF]/30';
  if (c === 'ERC20') return 'bg-[#0284C7]/10 text-[#0284C7] border-[#0284C7]/30';
  if (c === 'BEP20') return 'bg-[#F59E0B]/10 text-[#D97706] border-[#F59E0B]/30';
  if (c === 'SOL') return 'bg-[#8B5CF6]/10 text-[#7C3AED] border-[#8B5CF6]/30';
  if (c === 'BTC') return 'bg-[#F97316]/10 text-[#EA580C] border-[#F97316]/30';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

const STATUS_LABEL: Record<number, string> = {
  0: 'asset.statusPending',
  1: 'asset.statusApproved',
  2: 'asset.statusRejected',
  3: 'asset.statusWaiting',
  4: 'asset.statusDepositFailed',
  5: 'asset.statusAbnormal',
  6: 'asset.statusExpired',
};

export default function DepositPage() {
  const [params] = useSearchParams();
  const coin = params.get('coin');
  const chain = params.get('chain');

  if (coin) {
    return <DepositDetail initialCoin={coin} initialChain={chain || undefined} />;
  }
  return <DepositCoinList />;
}

function DepositCoinList() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [coins, setCoins] = useState<CoinInfo[]>(
    () => (getCoinListCacheSnapshot() ?? []).filter((item) => item.depositEnabled === 1)
  );
  const [rates, setRates] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'usdt' | 'main' | 'other'>('all');

  useEffect(() => {
    fetchCoinListCached()
      .then((rows) => setCoins((rows ?? []).filter((item) => item.depositEnabled === 1)))
      .catch(() => setCoins([]));

    const symbols = DEPOSIT_OPTIONS.map((item) => item.quoteSymbol).filter(Boolean) as string[];
    fetchTicks(symbols)
      .then((ticks) => {
        const next: Record<string, string> = {};
        ticks?.forEach((tick) => {
          next[tick.symbol] = tick.price;
        });
        setRates(next);
      })
      .catch(() => setRates({}));
  }, []);

  const coinLogoMap = useMemo(
    () => new Map(coins.map((item) => [item.code, item.logo ?? null])),
    [coins]
  );

  const enabledOptions = useMemo(() => {
    return DEPOSIT_OPTIONS.filter((option) => {
      if (option.coin === 'USDT') return true;
      return coins.some((coin) => coin.code === option.coin);
    });
  }, [coins]);

  const filteredOptions = useMemo(() => {
    return enabledOptions.filter((option) => {
      if (selectedCategory === 'usdt' && option.coin !== 'USDT') return false;
      if (selectedCategory === 'main' && !['BTC', 'ETH', 'SOL'].includes(option.coin)) return false;
      if (selectedCategory === 'other' && (option.coin === 'USDT' || ['BTC', 'ETH', 'SOL'].includes(option.coin))) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchCoin = option.coin.toLowerCase().includes(q);
        const matchChain = option.chain.toLowerCase().includes(q);
        const matchTitle = option.title.toLowerCase().includes(q);
        const fullName = COIN_FULL_NAMES[option.coin]?.toLowerCase() ?? '';
        const matchName = fullName.includes(q);
        return matchCoin || matchChain || matchTitle || matchName;
      }
      return true;
    });
  }, [enabledOptions, selectedCategory, searchQuery]);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#F8FAFC]">
      <DepositHeader
        title={t('asset.deposit', '储值')}
        onBack={() => nav('/assets')}
      />

      <main className="px-4 pb-8 pt-3.5">
        {/* 顶部安全充值提示卡片 */}
        <div className="mb-3.5 rounded-2xl border border-primary/20 bg-gradient-to-br from-[#00C4DF]/10 via-[#0284C7]/5 to-transparent p-3.5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <ShieldCheck size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold text-text">
                {t('asset.safeDepositTitle', '官方多链聚合充币')}
              </div>
              <div className="mt-0.5 text-[11px] leading-relaxed text-textSub">
                {t('asset.safeDepositTip', '智能多链通道秒级到账，请仔细核对币种与网络一致。')}
              </div>
            </div>
          </div>
        </div>

        {/* 实时搜索栏 */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('asset.searchCoinPlaceholder', '搜索币种名称 / 充值网络...')}
            className="h-11 w-full rounded-xl border border-[#E8EEF3] bg-white pl-10 pr-9 text-xs font-medium text-text placeholder:text-textSub/60 outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/15 shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-textSub hover:text-text"
              aria-label="clear"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* 快捷分类标签 */}
        <div className="mb-3.5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { key: 'all', label: t('common.all', '全部') },
            { key: 'usdt', label: 'USDT (多链)' },
            { key: 'main', label: t('market.mainstream', '主流币') },
            { key: 'other', label: t('market.others', '其他币种') },
          ].map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key as any)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedCategory === cat.key
                  ? 'bg-primary text-white shadow-sm shadow-primary/25'
                  : 'border border-[#E8EEF3] bg-white text-textSub hover:text-text'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 充币选项列表 */}
        {filteredOptions.length === 0 ? (
          <div className="my-6 rounded-2xl border border-[#E8EEF3] bg-white py-12 text-center">
            <Search size={28} className="mx-auto text-textSub/40 mb-2" />
            <p className="text-xs text-textSub">{t('common.noData', '未找到匹配的充币选项')}</p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 inline-flex h-8 items-center rounded-lg bg-primary/10 px-3 text-xs font-semibold text-primary"
              >
                {t('common.clearSearch', '清空搜索')}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredOptions.map((option) => {
              const isUsdt = option.coin === 'USDT';
              const currentRate = isUsdt ? '1' : option.quoteSymbol ? rates[option.quoteSymbol] : undefined;
              const formattedRate = formatRate(currentRate);

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => nav(`/assets/deposit?coin=${option.coin}&chain=${option.chain}`)}
                  className="group flex w-full items-center justify-between rounded-2xl border border-[#E8EEF3] bg-white p-3.5 shadow-xs hover:border-primary/40 hover:shadow-sm transition active:scale-[0.99] text-left"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F8FAFC] border border-[#E8EEF3]">
                      <CoinIcon coin={option.coin} logo={coinLogoMap.get(option.coin)} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-bold text-text">{option.coin}</span>
                        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getChainBadgeStyle(option.chain)}`}>
                          {option.chain}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] font-medium text-textSub truncate">
                        {COIN_FULL_NAMES[option.coin] ?? option.coin}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 ml-2">
                    <div className="text-right">
                      <div className="text-[10px] font-medium text-textSub">
                        {t('asset.rate', '参考汇率')}
                      </div>
                      <div className="num mt-0.5 text-[13px] font-bold text-text">
                        {isUsdt ? '$ 1.00' : formattedRate === '--' ? '--' : `≈ $ ${formattedRate}`}
                      </div>
                    </div>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-bgSoft/60 text-textSub/50 group-hover:bg-primary/10 group-hover:text-primary transition">
                      <ChevronRight size={15} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* 底部充币须知与安全提示 */}
        <div className="mt-6 rounded-2xl border border-[#E8EEF3] bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-text">
            <HelpCircle size={15} className="text-primary" />
            <span>{t('asset.depositNoticeTitle', '储值须知与安全提示')}</span>
          </div>
          <ul className="mt-2.5 space-y-1.5 text-[11px] leading-relaxed text-textSub list-disc list-inside">
            <li>{t('asset.depositNotice1', '充值前请务必仔细核对币种与网络，充错网络资产将无法找回')}</li>
            <li>{t('asset.depositNotice2', '充值到账时间取决于区块网络确认数，一般 1-3 分钟内完成')}</li>
            <li>{t('asset.depositNotice3', '如充值遇到延迟或疑问，请随时联系 7x24 小时在线客服')}</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

function DepositDetail({ initialCoin, initialChain }: { initialCoin: string; initialChain?: string }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [coins, setCoins] = useState<CoinInfo[]>(
    () => (getCoinListCacheSnapshot() ?? []).filter((item) => item.depositEnabled === 1)
  );
  const [coin, setCoin] = useState(initialCoin);
  const [chain, setChain] = useState(initialChain || '');
  const [addrList, setAddrList] = useState<DepositAddress[]>([]);
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [fromAddr, setFromAddr] = useState('');
  const [orders, setOrders] = useState<DepositOrder[]>([]);
  const [mode, setMode] = useState<DepositMode | null>(null);
  const [activeMode, setActiveMode] = useState<'MANUAL' | 'UDUN'>('MANUAL');
  const [udunOrder, setUdunOrder] = useState<DepositOrder | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCoinListCached()
      .then((rows) => setCoins((rows ?? []).filter((item) => item.depositEnabled === 1)))
      .catch(() => setCoins([]));
    loadOrders();
  }, []);

  useEffect(() => {
    fetchDepositAddress(coin)
      .then((rows) => {
        const list = rows ?? [];
        setAddrList(list);
        if (!chain && list.length) setChain(list[0].chain);
      })
      .catch(() => setAddrList([]));
  }, [coin, chain]);

  useEffect(() => {
    if (!coin) return;
    fetchDepositMode(coin, chain || undefined)
      .then((next) => {
        setMode(next);
        setActiveMode(next.mode === 'UDUN' ? 'UDUN' : 'MANUAL');
      })
      .catch(() => {
        setMode(null);
        setActiveMode('MANUAL');
      });
  }, [coin, chain]);

  useEffect(() => {
    if (!udunOrder || udunOrder.status !== 3) return;
    const timer = window.setInterval(() => {
      fetchDepositOrder(udunOrder.orderNo)
        .then((next) => {
          setUdunOrder(next);
          if (next.status === 1) {
            toast.success(t('deposit.credited'));
            loadOrders();
          }
        })
        .catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [udunOrder]);

  const selected = useMemo(() => coins.find((item) => item.code === coin), [coins, coin]);
  const addr = useMemo(
    () => addrList.find((item) => item.chain === chain) ?? addrList[0],
    [addrList, chain]
  );

  const loadOrders = () => {
    fetchDepositOrders(1, 10).then((page) => setOrders(page?.records ?? [])).catch(() => setOrders([]));
  };

  const onCopy = (txt: string) => {
    navigator.clipboard.writeText(txt).then(() => toast.success(t('common.copied')));
  };

  const onSubmit = async () => {
    // if (!txHash.trim()) return toast.error(t('asset.txHashRequired'));
    if (!amount || Number(amount) <= 0) return toast.error(t('asset.amountPlaceholder'));
    if (!addr?.address) return toast.error(t('asset.depositAddressUnavailable'));
    setLoading(true);
    try {
      await submitDeposit({
        coin,
        chain,
        amount,
        txHash: txHash.trim() || '-',
        fromAddress: fromAddr || '-',
        toAddress: addr?.address,
      });
      toast.success(t('asset.submitted'));
      setAmount('');
      setTxHash('');
      setFromAddr('');
      loadOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('asset.submitFailed'));
    } finally {
      setLoading(false);
    }
  };

  const onCreateUdunOrder = async () => {
    if (amount && Number(amount) <= 0) return toast.error(t('asset.amountPlaceholder'));
    setLoading(true);
    try {
      const order = await createUdunDepositOrder({
        coin,
        chain,
        amount: amount || undefined,
      });
      setUdunOrder(order);
      toast.success(t('deposit.addressGenerated'));
      loadOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('deposit.generateFailed'));
      if (mode?.fallbackToManual === 1 && mode.manualEnabled === 1) {
        setActiveMode('MANUAL');
      }
    } finally {
      setLoading(false);
    }
  };

  const manualEnabled = !mode || mode.manualEnabled === 1 || mode.mode === 'MANUAL' || mode.mode === 'BOTH';
  const udunEnabled = mode?.udunEnabled === 1 || mode?.mode === 'UDUN' || mode?.mode === 'BOTH';

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#F8FAFC] pb-8">
      <DepositHeader title={t('asset.depositTitle', { coin })} onBack={() => nav('/assets/deposit')} />
      <main className="px-4 pt-4">
        <div className="rounded-2xl border border-[#E8EEF3] bg-white p-4.5 shadow-card">
          <Field label={t('asset.selectCoin')}>
            <AsterSelect
              value={coin}
              onChange={(value) => {
                setCoin(String(value));
                setChain('');
              }}
              options={coins.map((item) => ({ value: item.code, label: `${item.code} - ${item.name}` }))}
              triggerClassName="h-11"
            />
          </Field>

          {addrList.length > 0 && (
            <Field label={t('asset.selectChain')}>
              <div className="flex flex-wrap gap-2">
                {addrList.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setChain(item.chain)}
                    className={`h-9 rounded-xl px-3.5 text-xs font-bold transition ${
                      chain === item.chain
                        ? 'bg-primary text-white shadow-sm shadow-primary/25'
                        : 'border border-[#E8EEF3] bg-white text-textSub hover:text-text'
                    }`}
                  >
                    {item.chain}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {mode?.mode === 'BOTH' && (
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-bgSoft p-1 text-sm">
              <button
                type="button"
                onClick={() => setActiveMode('MANUAL')}
                className={`h-9 rounded-lg font-semibold transition ${activeMode === 'MANUAL' ? 'bg-white text-text shadow-sm' : 'text-textSub'}`}
              >
                {t('deposit.manual')}
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('UDUN')}
                className={`h-9 rounded-lg font-semibold transition ${activeMode === 'UDUN' ? 'bg-white text-text shadow-sm' : 'text-textSub'}`}
              >
                {t('deposit.auto')}
              </button>
            </div>
          )}

          {activeMode === 'MANUAL' && manualEnabled && (
            <>
              {addr && (
                <Field label={t('asset.depositAddress')}>
                  <div className="rounded-xl border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-primary">{chain} 网络充值地址</span>
                      {selected && (
                        <span className="text-[10px] text-textSub">
                          {t('asset.minDeposit')}: {selected.minDeposit} {selected.code}
                        </span>
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-2 rounded-lg bg-white border border-[#E8EEF3] px-3 py-2.5 shadow-xs">
                      <span className="num flex-1 break-all text-xs font-semibold text-text select-all">{addr.address}</span>
                      <button
                        type="button"
                        onClick={() => onCopy(addr.address)}
                        className="shrink-0 flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/20 transition active:scale-95"
                        aria-label="copy"
                      >
                        <Copy size={13} />
                        {t('common.copy', '复制')}
                      </button>
                    </div>
                  </div>
                </Field>
              )}

              <Field label={t('asset.amount')}>
                <div className="relative">
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={t('asset.amountPlaceholder', '请输入充值数量')}
                    className="num h-11 w-full rounded-xl border border-[#E8EEF3] bg-white px-3.5 text-sm font-semibold text-text outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition shadow-xs"
                    inputMode="decimal"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-textSub">
                    {coin}
                  </span>
                </div>
              </Field>

              <button
                type="button"
                disabled={loading}
                onClick={onSubmit}
                className="mt-6 h-12 w-full rounded-xl bg-gradient-to-r from-[#00C4DF] to-[#0284C7] text-sm font-bold text-white shadow-md shadow-cyan-500/25 disabled:opacity-50 transition active:scale-[0.99]"
              >
                {loading ? t('common.submitting', '提交中...') : t('common.submit', '确认提交充币')}
              </button>
            </>
          )}

          {activeMode === 'UDUN' && udunEnabled && (
            <div className="rounded-xl border border-[#E8EEF3] p-4 bg-[#F8FAFC]">
              <Field label={t('asset.amount')}>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t('deposit.autoAmountPlaceholder')}
                  className="num h-11 w-full rounded-xl border border-[#E8EEF3] bg-white px-3 text-sm outline-none"
                  inputMode="decimal"
                />
              </Field>
              <button
                type="button"
                disabled={loading}
                onClick={onCreateUdunOrder}
                className="h-11 w-full rounded-xl bg-primary text-sm font-medium text-white shadow-sm shadow-primary/25 disabled:opacity-50"
              >
                {udunOrder ? t('deposit.regenerateAddress') : t('deposit.generateAddress')}
              </button>
              {udunOrder?.toAddress && (
                <div className="mt-4 rounded-xl bg-white border border-[#E8EEF3] p-3 text-xs">
                  <div className="mb-2 font-bold text-text">{t('deposit.sendToAddress')}</div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="num break-all text-text font-semibold">{udunOrder.toAddress}</span>
                    <button onClick={() => onCopy(udunOrder.toAddress!)} className="shrink-0 text-primary" aria-label="copy">
                      <Copy size={16} />
                    </button>
                  </div>
                  <div className="mt-2 text-textSub">{t('deposit.orderNo')}{udunOrder.orderNo}</div>
                  <div className="mt-1 text-textSub">{t('deposit.status')}{udunOrder.status === 1 ? t('asset.statusArrived') : t('asset.statusWaiting')}</div>
                  {udunOrder.expireAt && <div className="mt-1 text-textSub">{t('deposit.expireAt')}{udunOrder.expireAt}</div>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 历史充值记录 */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-[14px] font-bold text-text">{t('asset.depositHistory', '近期储值记录')}</h3>
          </div>
          {orders.length === 0 ? (
            <div className="py-8 text-center text-xs text-textSub bg-white rounded-2xl border border-[#E8EEF3]">
              {t('common.noData', '暂无储值记录')}
            </div>
          ) : (
            <ul className="space-y-2.5">
              {orders.map((order) => (
                <li key={order.id} className="rounded-xl border border-[#E8EEF3] bg-white p-3.5 shadow-xs text-xs">
                  <div className="flex items-center justify-between">
                    <span className="num font-bold text-[14px] text-text">
                      +{order.amount} {order.coin}
                    </span>
                    <StatusTag status={order.status} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-textSub">
                    <span>{order.chain} 网络</span>
                    <span>{order.createdAt}</span>
                  </div>
                  {order.txHash && (
                    <div className="num mt-1.5 break-all rounded bg-bgSoft px-2 py-1 text-[10px] text-textSub">
                      TXID: {order.txHash}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function DepositHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E8EEF3] bg-white/95 px-4 backdrop-blur-md">
      <button
        onClick={onBack}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-bgSoft/60 text-text hover:bg-bgSoft hover:text-primary transition active:scale-95"
        aria-label="back"
      >
        <ChevronLeft size={20} />
      </button>
      <div className="text-[16px] font-bold text-text">{title}</div>
      <div className="flex h-9 w-9 items-center justify-center">
        {right ?? <div className="w-9" />}
      </div>
    </header>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-xs text-textSub">{label}</div>
      {children}
    </div>
  );
}

function StatusTag({ status }: { status: number }) {
  const { t } = useTranslation();
  const cls =
    status === 1
      ? 'bg-upBg text-up'
      : status === 2
      || status === 4
      || status === 5
      || status === 6
      ? 'bg-downBg text-down'
      : 'bg-bgSoft text-textSub';
  return <span className={`rounded px-2 py-0.5 text-[10px] ${cls}`}>{t(STATUS_LABEL[status] ?? 'asset.statusPending')}</span>;
}

function CoinIcon({ coin, logo }: { coin: string; logo?: string | null }) {
  return <AsterCoinLogo coin={coin} logo={logo} size={36} />;
}

function formatRate(value: string | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '--';
  if (n >= 1000) return n.toFixed(2);
  if (n >= 10) return n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  if (n >= 1) return n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}
