import { NavLink } from 'react-router-dom';
import {
  ArrowLeftRight,
  BarChart3,
  CircleDollarSign,
  FileText,
  Image,
  RefreshCcw,
  Target,
  Wallet,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PcContainer } from '@/components/pc';

type AssetMenuItem = {
  key: string;
  label: string;
  to: string;
  icon: ReactNode;
  end?: boolean;
};

export type AssetMenuKey = 'overview' | 'spot' | 'finance' | 'trade' | 'orders' | 'nft' | 'transfer';

export function PcAssetLayout({
  active,
  children,
}: {
  active: AssetMenuKey;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const items: AssetMenuItem[] = [
    { key: 'overview', label: t('asset.overview', 'Overview'), to: '/assets', end: true, icon: <Wallet size={16} /> },
    { key: 'spot', label: t('asset.spotAcc', 'Spot Account'), to: '/assets/account/1', icon: <CircleDollarSign size={16} /> },
    { key: 'finance', label: t('asset.financeAcc', 'Finance Account'), to: '/assets/account/3', icon: <Target size={16} /> },
    { key: 'trade', label: t('asset.tradeAcc', 'Trade Account'), to: '/assets/account/2', icon: <BarChart3 size={16} /> },
    { key: 'orders', label: t('asset.orderCenter', t('home.orderCenter', 'Order Center')), to: '/assets/bill', icon: <FileText size={16} /> },
    { key: 'nft', label: 'NFT', to: '/assets/nft/manage', icon: <Image size={16} /> },
    { key: 'transfer', label: t('asset.transfer', 'Transfer'), to: '/assets/transfer', icon: <ArrowLeftRight size={16} /> },
  ];

  return (
    <div className="pc-asset-shell min-h-[calc(100vh-70px)] bg-bg">
      <PcContainer className="flex min-h-[580px] pt-8 pb-16">
        <aside className="w-[200px] shrink-0 pr-6 border-r border-line">
          <nav className="flex flex-col gap-1.5 font-medium">
            {items.map((item) => {
              const isActive = active === item.key;
              return (
                <NavLink
                  key={item.key}
                  to={item.to}
                  end={item.end}
                  className={`flex h-10 items-center gap-3 rounded-xl px-3.5 text-[14px] transition-all duration-150 ${
                    isActive
                      ? 'bg-text text-white font-semibold shadow-sm'
                      : 'text-textSubPc hover:bg-bgSoft hover:text-text'
                  }`}
                >
                  <span className="flex h-4 w-4 items-center justify-center shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 pl-8">{children}</main>
      </PcContainer>
    </div>
  );
}

export function PcAssetTitle({
  title,
  eye = true,
  showVal = true,
  onToggleEye,
  right,
}: {
  title: ReactNode;
  eye?: boolean;
  showVal?: boolean;
  onToggleEye?: () => void;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="pc-asset-title flex items-center gap-2">
        <span>{title}</span>
        {eye ? (
          <button
            type="button"
            onClick={onToggleEye}
            className="cursor-pointer text-textSubPc hover:text-text transition inline-flex items-center"
            title={showVal ? '隐藏金额' : '显示金额'}
          >
            {showVal ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        ) : null}
      </h1>
      {right ? <div className="flex items-center">{right}</div> : null}
    </div>
  );
}

export function PcAssetAmount({
  value,
  compact = false,
  showVal = true,
}: {
  value: string | number | undefined;
  compact?: boolean;
  showVal?: boolean;
}) {
  const numVal = Number(value ?? 0);
  return (
    <div className="mt-4">
      <div className={`num font-bold text-text tracking-tight flex items-baseline gap-2 ${compact ? 'text-[24px]' : 'text-[32px]'}`}>
        <span>
          {showVal
            ? `$${numVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '******'}
        </span>
        <span className="text-[14px] font-semibold text-textSubPc">USDT</span>
      </div>
      <div className="num mt-1 text-[13px] font-medium text-textSubPc">
        {showVal ? `≈ $${numVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` : '≈ **** USD'}
      </div>
    </div>
  );
}

export function PcAssetActionButton({
  children,
  active = false,
  onClick,
  icon,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-[13px] font-semibold transition-all duration-150 active:scale-[0.98] ${
        active
          ? 'bg-gradient-to-r from-[#00C4DF] to-[#0284C7] text-white shadow-[0_2px_10px_rgba(0,196,223,0.3)] hover:opacity-95'
          : 'border border-line bg-card text-text shadow-sm hover:bg-bgSoft hover:border-lineSolid'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

export function PcAssetEmpty({ label }: { label: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center text-textSubPc">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bgSoft text-textMute mb-3 shadow-inner">
        <Wallet size={26} strokeWidth={1.6} />
      </div>
      <div className="text-[13px] font-medium">{label}</div>
    </div>
  );
}

export function PcAssetTrend() {
  const { t } = useTranslation();
  const [activeRange, setActiveRange] = useState(0);
  const ranges = [t('asset.rangeDay'), t('asset.rangeWeek'), t('asset.rangeMonth'), t('asset.rangeYear')];
  const ticks = ['01:00', '05:00', '09:00', '13:00', '17:00', '21:00', '23:00'];
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="m-0 text-[15px] font-bold text-text">{t('asset.assetTrend')}</h2>
        <div className="flex gap-1.5 rounded-lg bg-bgSoft p-0.5 text-[12px] font-medium">
          {ranges.map((item, index) => (
            <button
              key={item}
              type="button"
              onClick={() => setActiveRange(index)}
              className={`h-6 rounded-md px-2.5 transition-all ${
                activeRange === index
                  ? 'bg-white font-semibold text-text shadow-sm'
                  : 'text-textSubPc hover:text-text'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="relative h-[160px] w-full overflow-hidden rounded-xl bg-gradient-to-b from-bgSoft/30 to-transparent p-2">
        <svg viewBox="0 0 620 130" className="h-[115px] w-full" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00C4DF" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#00C4DF" stopOpacity="0.0" />
            </linearGradient>
            <pattern id="asset-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#EDF2F7" strokeWidth="1" strokeDasharray="2 3" />
            </pattern>
          </defs>
          <rect width="620" height="120" fill="url(#asset-grid)" />
          <path d="M 10 100 Q 120 95 200 80 T 380 60 T 520 38 T 610 25 L 610 120 L 10 120 Z" fill="url(#trend-area)" />
          <path d="M 10 100 Q 120 95 200 80 T 380 60 T 520 38 T 610 25" fill="none" stroke="#00C4DF" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <div className="flex items-center justify-between pt-1 px-1 text-[11px] text-textSubPc font-medium">
          {ticks.map((tick) => <span key={tick}>{tick}</span>)}
        </div>
      </div>
    </div>
  );
}

export function PcAssetRefreshIcon() {
  return <RefreshCcw size={12} />;
}
