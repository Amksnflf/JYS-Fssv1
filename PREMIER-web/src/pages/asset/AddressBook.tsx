import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeOff, Plus, Search, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { toast } from '@/components/Toast';
import { AsterSelect } from '@/components/AsterUI';
import { EmptyState } from '@/components/AsterUI';
import {
  addAddress,
  deleteAddress,
  fetchAddresses,
  fetchCoinListCached,
  fetchDepositAddress,
  getCoinListCacheSnapshot,
  type AddressItem,
  type CoinInfo,
  type DepositAddress,
} from '@/api/asset';

export default function AddressBookPage() {
  const { t } = useTranslation();
  const [list, setList] = useState<AddressItem[]>([]);
  const [coins, setCoins] = useState<CoinInfo[]>(() => getCoinListCacheSnapshot() ?? []);
  const [chains, setChains] = useState<DepositAddress[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    coin: 'USDT',
    chain: '',
    address: '',
    memo: '',
    remark: '',
  });

  useEffect(() => {
    fetchCoinListCached().then((d) => setCoins(d ?? [])).catch(() => undefined);
    refresh();
  }, []);

  useEffect(() => {
    fetchDepositAddress(form.coin)
      .then((rows) => {
        const list = rows ?? [];
        setChains(list);
        if (list.length > 0) {
          setForm((prev) => ({
            ...prev,
            chain: list.some((r) => r.chain === prev.chain) ? prev.chain : list[0].chain,
          }));
        } else {
          const matchedCoin = coins.find((c) => c.code === form.coin);
          if (matchedCoin?.chain) {
            setForm((prev) => ({ ...prev, chain: matchedCoin.chain || prev.chain }));
          }
        }
      })
      .catch(() => {
        setChains([]);
      });
  }, [form.coin, coins]);

  const refresh = () => {
    fetchAddresses().then((d) => setList(d ?? [])).catch(() => undefined);
  };

  const onAdd = async () => {
    if (!form.address.trim()) return toast.error(t('asset.addressPlaceholder'));
    try {
      await addAddress({
        ...form,
        address: form.address.trim(),
      });
      toast.success(t('common.submit'));
      setShowForm(false);
      setForm((prev) => ({ ...prev, address: '', memo: '', remark: '' }));
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'fail');
    }
  };

  const onDelete = async (id: number) => {
    try {
      await deleteAddress(id);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'fail');
    }
  };

  return (
    <div className="pb-8">
      <PageHeader
        title={t('asset.addressBook')}
        fallbackPath="/assets"
        right={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1 text-text"
          >
            <Plus size={14} /> {t('asset.addAddress')}
          </button>
        }
      />
      <div className="mx-auto max-w-md px-4 pt-4 md:max-w-[640px] md:px-6">
        <div className="aster-search mb-6">
          <Search size={18} />
          <span className="flex-1 text-textSub">{t('asset.searchCoinRemark')}</span>
          <EyeOff size={17} className="text-up" />
        </div>
        {showForm && (
          <div className="mb-4 space-y-3 rounded-xl border border-line p-3">
            <AsterSelect
              value={form.coin}
              onChange={(value) => setForm({ ...form, coin: String(value) })}
              options={coins.map((c) => ({ value: c.code, label: c.code }))}
              triggerClassName="h-11"
            />
            {chains.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {chains.map((item) => (
                  <button
                    key={item.chain}
                    type="button"
                    onClick={() => setForm({ ...form, chain: item.chain })}
                    className={`h-9 rounded px-3 text-xs ${
                      form.chain === item.chain ? 'bg-text text-white' : 'bg-bgSoft text-textSub'
                    }`}
                  >
                    {item.chain}
                  </button>
                ))}
              </div>
            ) : (
              <input
                value={form.chain}
                onChange={(e) => setForm({ ...form, chain: e.target.value })}
                placeholder={t('asset.selectChain')}
                className="h-11 w-full rounded-lg bg-bgSoft px-3 text-sm outline-none"
              />
            )}
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder={t('asset.addressPlaceholder')}
              className="h-11 w-full rounded-lg bg-bgSoft px-3 text-sm outline-none"
            />
            <input
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
              placeholder="Memo"
              className="h-11 w-full rounded-lg bg-bgSoft px-3 text-sm outline-none"
            />
            <input
              value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
              placeholder={t('asset.remarkName')}
              className="h-11 w-full rounded-lg bg-bgSoft px-3 text-sm outline-none"
            />
            <button
              onClick={onAdd}
              className="btn-primary w-full"
            >
              {t('common.confirm')}
            </button>
          </div>
        )}

        {list.length === 0 ? (
          <EmptyState
            title={t('common.noData')}
            desc={t('asset.noAddress')}
            action={
              <button onClick={() => setShowForm(true)} className="font-semibold text-up">
                {t('asset.addAddressHint')}
              </button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {list.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-2 rounded-xl border border-line p-3 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    {a.remark || a.coin} <span className="text-textSub text-xs">{a.coin} · {a.chain}</span>
                  </div>
                  <div className="mt-1 text-textSub break-all num">{a.address}</div>
                  {a.memo && <div className="mt-0.5 text-textSub">Memo: {a.memo}</div>}
                </div>
                <button
                  onClick={() => onDelete(a.id)}
                  className="text-textMute hover:text-down"
                  aria-label="delete"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
