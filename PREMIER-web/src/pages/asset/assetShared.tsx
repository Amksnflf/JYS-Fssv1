import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CoinLogo as AsterCoinLogo } from '@/components/AsterUI';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  ChevronLeft,
  Eye,
  EyeOff,
  FileText,
  Zap,
} from 'lucide-react';

export const ASSET_COINS = ['ETH', 'TRX', 'BCH', 'XRP', 'LTC', 'XTZ', 'APE', 'USDT', 'BTC', 'USDC', 'DAI', 'SOL', 'DOGE', 'LINK'];
export const DETAIL_COINS = ['USDT', 'BTC', 'ETH', 'TRX'];
export const NFT_COINS = ['APE', 'MANA', 'THETA'];

export function formatUsd(value: string | number | undefined, digits = 2) {
  const n = Number(value ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// 截断保留指定位数小数（非四舍五入）
export function truncateDecimal(value: string | number | undefined, digits = 2) {
  const n = Number(value ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  const multiplier = Math.pow(10, digits);
  const truncated = Math.floor(safe * multiplier) / multiplier;
  return truncated.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function AssetHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-line bg-bg/95 px-4 backdrop-blur">
      <button onClick={onBack} className="flex h-10 w-10 items-center justify-start" aria-label="back">
        <ChevronLeft size={25} />
      </button>
      <div className="text-lg font-semibold">{title}</div>
      <div className="w-10" />
    </header>
  );
}

export function CoinIcon({
  coin,
  logo,
  size = 38,
  loading = false,
}: {
  coin: string;
  logo?: string | null;
  size?: number;
  loading?: boolean;
}) {
  return <AsterCoinLogo coin={coin} logo={logo} size={size} loading={loading} />;
}

export function AssetActions({ variant = 'home' }: { variant?: 'home' | 'spot' | 'trade' | 'finance' }) {
  const { t } = useTranslation();
  const actions =
    variant === 'spot'
      ? [
          { label: t('asset.transfer'), path: '/assets/transfer', icon: ArrowLeftRight },
          { label: t('asset.flash'), path: '/assets/flash', icon: Zap },
          { label: t('asset.bill'), path: '/assets/bill', icon: FileText },
        ]
      : variant === 'trade' || variant === 'finance'
      ? [
          { label: t('asset.deposit'), path: '/assets/deposit', icon: ArrowDownToLine },
          { label: t('asset.withdraw'), path: '/assets/withdraw', icon: ArrowUpFromLine },
          { label: t('asset.transfer'), path: '/assets/transfer', icon: ArrowLeftRight },
          { label: t('asset.bill'), path: '/assets/bill', icon: FileText },
        ]
      : [
          { label: t('asset.deposit'), path: '/assets/deposit', icon: ArrowDownToLine },
          { label: t('asset.withdraw'), path: '/assets/withdraw', icon: ArrowUpFromLine },
          { label: t('asset.transfer'), path: '/assets/transfer', icon: ArrowLeftRight },
          { label: t('asset.flash'), path: '/assets/flash', icon: Zap },
          { label: t('asset.bill'), path: '/assets/bill', icon: FileText },
        ];

  return (
    <div className={`grid text-center text-xs ${actions.length === 5 ? 'grid-cols-5' : 'grid-cols-4'} gap-2 rounded-2xl bg-white p-4 border border-slate-100 shadow-sm`}>
      {actions.map(({ label, path, icon: Icon }) => (
        <Link key={label} to={path} className="group flex flex-col items-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500/10 to-sky-500/20 text-cyan-600 border border-cyan-100/80 transition duration-200 group-hover:scale-105 group-active:scale-95 shadow-sm">
            <Icon size={20} strokeWidth={2.2} />
          </span>
          <span className="font-semibold text-slate-700 tracking-tight group-hover:text-cyan-600 transition">{label}</span>
        </Link>
      ))}
    </div>
  );
}

export function TotalBlock({ total, todayProfit, compact = false }: { total: string | number; todayProfit?: string | number; compact?: boolean }) {
  const { t } = useTranslation();
  const [showVal, setShowVal] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('coinex_assets_show_val');
      if (saved !== null) return saved === 'true';
    }
    return false;
  });

  const toggleShow = () => {
    setShowVal((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('coinex_assets_show_val', String(next));
      }
      return next;
    });
  };

  const main = compact ? formatUsd(total, 2) : truncateDecimal(total, 2);
  const profit = Number(todayProfit ?? 0);
  const profitSign = profit >= 0 ? '+' : '';
  const profitDisplay = `${profitSign}$${formatUsd(Math.abs(profit), 2)}`;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#091526] via-[#0E2038] to-[#0A182B] p-5 text-white shadow-xl shadow-slate-900/10 border border-white/10">
      {/* Decorative Blur Backgrounds */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-blue-600/15 blur-2xl" />

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/85">
            <span>{t('asset.total')} (USD)</span>
            <button
              type="button"
              onClick={toggleShow}
              className="text-white/80 hover:text-white transition"
              aria-label="Toggle visibility"
            >
              {showVal ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </div>
          <div className="rounded-full bg-white/10 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-semibold text-white border border-white/10">
            {t('asset.todayPnl')}: {showVal ? profitDisplay : '****'}
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-black tracking-tight num">
            ${showVal ? main : '******'}
          </span>
          <span className="text-sm font-semibold text-white/70">USD</span>
        </div>
      </div>
    </section>
  );
}

export function EmptyAssetIcon() {
  return (
    <div className="relative mx-auto h-[180px] w-[180px]">
      <div className="absolute left-8 top-7 h-24 w-24 rotate-[-22deg] border border-text/80 bg-white shadow-[0_8px_18px_rgba(4,3,3,0.06)]" />
      <div className="absolute left-12 top-11 flex h-20 w-20 items-center justify-center border-[3px] border-text bg-white text-4xl font-bold text-text">
        ?
      </div>
      <div className="absolute right-8 top-20 flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-[#D7335F] text-[#D7335F]">
        <span className="h-1 w-16 rotate-[-35deg] rounded-full bg-[#D7335F]" />
      </div>
    </div>
  );
}

export function SectionHeading({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-black tracking-[-0.02em]">{children}</h2>
      {right ? <div className="text-sm font-medium text-text">{right}</div> : null}
    </div>
  );
}

function coinColor(coin: string) {
  const map: Record<string, string> = {
    USDT: '#63BFA7',
    BTC: '#F5A623',
    ETH: '#2F343A',
    TRX: '#F0162F',
    BCH: '#7AC85B',
    XRP: '#20252B',
    LTC: '#4B7CCB',
    XTZ: '#377DE5',
    APE: '#1E5FD2',
    MANA: '#FF6B6B',
    THETA: '#2CBFD6',
    USDC: '#4F8FF7',
    DAI: '#F4B731',
    SOL: '#7B61FF',
    DOGE: '#C7A84A',
    LINK: '#3B68E8',
  };
  return map[coin] ?? '#16B68E';
}
