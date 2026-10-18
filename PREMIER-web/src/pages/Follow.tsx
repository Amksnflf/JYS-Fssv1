import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/PageHeader';
import { toast } from '@/components/Toast';
import {
  cancelFollow,
  fetchFollowTraders,
  fetchMyFollowOrders,
  startFollow,
  type FollowOrder,
  type FollowTrader,
} from '@/api/follow';
import { useResponsive } from '@/hooks/useResponsive';
import { PcContainer } from '@/components/pc';

export default function FollowPage() {
  const { t } = useTranslation();
  const { isPc } = useResponsive();
  const [traders, setTraders] = useState<FollowTrader[]>([]);
  const [orders, setOrders] = useState<FollowOrder[]>([]);
  const [amounts, setAmounts] = useState<Record<number, string>>({});

  const activeByTrader = useMemo(() => {
    const m = new Map<number, FollowOrder>();
    orders.filter((o) => o.status === 1).forEach((o) => m.set(o.traderId, o));
    return m;
  }, [orders]);

  const reload = () => {
    fetchFollowTraders().then((rows) => setTraders(rows ?? [])).catch(() => {});
    fetchMyFollowOrders(1, 1, 50).then((p) => setOrders(p?.records ?? [])).catch(() => {});
  };

  useEffect(() => {
    reload();
  }, []);

  const toggle = async (trader: FollowTrader) => {
    const running = activeByTrader.get(trader.id);
    try {
      if (running) {
        await cancelFollow(running.id);
        toast.success(t('follow.cancelled'));
      } else {
        await startFollow(trader.id, amounts[trader.id] || '100', 20);
        toast.success(t('follow.started'));
      }
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? t('follow.operationFailed'));
    }
  };

  if (isPc) {
    return (
      <div className="bg-bg py-12 text-text">
        <PcContainer>
          <div className="text-center">
            <h1 className="pc-h1 m-0">{t('follow.title')}</h1>
            <p className="mt-3 text-[20px] text-textMute">{t('follow.desc')}</p>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-5">
            {traders.map((trader) => {
              const enabled = activeByTrader.has(trader.id);
              const winRate = formatPercent(trader.winRate, 0);
              const pnlValue = Number(trader.pnlRate ?? 0);
              const pnlRate = formatSignedPercent(trader.pnlRate, 1);
              const followers = Number(trader.followers ?? 0);
              return (
                <article key={trader.id} className="rounded-lg border border-line bg-bg p-6 transition hover:shadow-pcCard">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TraderAvatar trader={trader} size={40} />
                      <div>
                        <div className="text-[16px] font-semibold text-text">{trader.name}</div>
                        <div className="text-[12px] text-textSubPc">{trader.style}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggle(trader)}
                      className={enabled ? 'pc-btn-ghost' : 'pc-btn-primary'}
                    >
                      {enabled ? t('follow.enabled') : t('follow.action')}
                    </button>
                  </div>
                  {!enabled && (
                    <input
                      value={amounts[trader.id] ?? ''}
                      onChange={(e) => setAmounts((old) => ({ ...old, [trader.id]: e.target.value }))}
                      placeholder={t('follow.amountPlaceholder')}
                      inputMode="decimal"
                      className="pc-input mt-4"
                    />
                  )}
                  <div className="mt-5 grid grid-cols-3 gap-3 text-center text-[13px]">
                    <div className="rounded-md bg-bgSection p-3">
                      <div className="num pc-price text-[18px] font-semibold text-text">{winRate}</div>
                      <div className="mt-1 text-textSubPc">{t('follow.winRate')}</div>
                    </div>
                    <div className="rounded-md bg-bgSection p-3">
                      <div className={`num pc-price text-[18px] font-semibold ${pnlValue >= 0 ? 'pc-up-text' : 'pc-down-text'}`}>
                        {pnlRate}
                      </div>
                      <div className="mt-1 text-textSubPc">{t('follow.pnlRate')}</div>
                    </div>
                    <div className="rounded-md bg-bgSection p-3">
                      <div className="num pc-price text-[18px] font-semibold text-text">{followers.toLocaleString()}</div>
                      <div className="mt-1 text-textSubPc">{t('follow.followers')}</div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </PcContainer>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <PageHeader title={t('follow.title')} fallbackPath="/discover" />
      <div className="px-4 pt-4 md:mx-auto md:max-w-[720px]">
        <div className="rounded-lg bg-bgSoft p-4">
          <div className="font-semibold">{t('follow.selectedTraders')}</div>
          <p className="mt-1 text-xs text-textSub">
            {t('follow.desc')}
          </p>
        </div>
        <div className="mt-3 space-y-3">
          {traders.map((trader) => {
            const enabled = activeByTrader.has(trader.id);
            const pnlValue = Number(trader.pnlRate ?? 0);
            const followers = Number(trader.followers ?? 0);
            return (
              <div key={trader.id} className="rounded-lg border border-line p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TraderAvatar trader={trader} size={40} />
                    <div>
                      <div className="font-semibold">{trader.name}</div>
                      <div className="mt-1 text-xs text-textSub">{trader.style}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggle(trader)}
                    className={`h-9 rounded-full px-4 text-xs ${enabled ? 'bg-bgSoft text-textMain' : 'bg-primary text-white'}`}
                  >
                    {enabled ? t('follow.enabled') : t('follow.action')}
                  </button>
                </div>
                {!enabled && (
                  <input
                    value={amounts[trader.id] ?? ''}
                    onChange={(e) => setAmounts((old) => ({ ...old, [trader.id]: e.target.value }))}
                    placeholder={t('follow.amountPlaceholder')}
                    inputMode="decimal"
                    className="mt-3 h-10 w-full rounded-lg bg-bgSoft px-3 text-sm outline-none"
                  />
                )}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <Metric label={t('follow.winRate')} value={formatPercent(trader.winRate, 0)} />
                  <Metric
                    label={t('follow.pnlRate')}
                    value={formatSignedPercent(trader.pnlRate, 1)}
                    positive={pnlValue >= 0}
                  />
                  <Metric label={t('follow.followers')} value={followers.toLocaleString()} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, positive = true }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded bg-bgSoft p-2">
      <div className={`font-mono text-sm ${positive ? 'text-up' : 'text-down'}`}>{value}</div>
      <div className="mt-1 text-textSub">{label}</div>
    </div>
  );
}

export function TraderAvatar({
  trader,
  size,
  ringClassName,
}: {
  trader: FollowTrader;
  size: number;
  ringClassName?: string;
}) {
  const imageUrl = resolveImageUrl(trader.avatar);
  const fallback = (trader.name || '?').slice(0, 1).toUpperCase();
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={trader.name}
        className={`rounded-full object-cover ${ringClassName ? `ring-2 ${ringClassName}` : ''}`}
        style={{ width: size, height: size, flexShrink: 0 }}
      />
    );
  }
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-text font-bold text-white ${ringClassName ? `ring-2 ${ringClassName}` : ''}`}
      style={{ width: size, height: size, fontSize: Math.max(14, Math.floor(size / 2.8)), flexShrink: 0 }}
    >
      {fallback}
    </span>
  );
}

function formatPercent(value: string | number | undefined, decimals: number) {
  const ratio = Number(value ?? 0);
  if (!Number.isFinite(ratio)) return `${(0).toFixed(decimals)}%`;
  return `${(ratio * 100).toFixed(decimals)}%`;
}

function formatSignedPercent(value: string | number | undefined, decimals: number) {
  const ratio = Number(value ?? 0);
  if (!Number.isFinite(ratio)) return `${(0).toFixed(decimals)}%`;
  const percent = ratio * 100;
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(decimals)}%`;
}

export function resolveImageUrl(value?: string) {
  if (!value) return '';
  if (value.startsWith('data:') || value.startsWith('blob:')) return value;
  const normalized = normalizeUploadPath(value);
  if (normalized.startsWith('/uploads/')) return `/api${normalized}`;
  return normalized;
}

function normalizeUploadPath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/api/uploads/')) return trimmed;
  if (trimmed.startsWith('api/uploads/')) return `/${trimmed}`;
  if (trimmed.startsWith('/uploads/')) return trimmed;
  if (trimmed.startsWith('uploads/')) return `/${trimmed}`;

  const apiUploadsIndex = trimmed.indexOf('/api/uploads/');
  if (apiUploadsIndex >= 0) return trimmed.slice(apiUploadsIndex);

  const uploadsIndex = trimmed.indexOf('/uploads/');
  if (uploadsIndex >= 0) return trimmed.slice(uploadsIndex);

  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}
