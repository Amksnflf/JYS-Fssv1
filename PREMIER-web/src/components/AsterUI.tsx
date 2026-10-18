import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Check, ChevronDown, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCoinLogoMap } from '@/hooks/useCoinLogoMap';
import { formatChangePercent, parseFiniteNumber } from '@/utils/number';

type TopBarProps = {
  title?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  onBack?: () => void;
  showBack?: boolean;
  className?: string;
};

export function MobileTopBar({
  title,
  left,
  right,
  onBack,
  showBack = false,
  className = '',
}: TopBarProps) {
  const nav = useNavigate();
  return (
    <header className={`aster-topbar ${className}`}>
      <div className="w-10 flex items-center">
        {left ??
          (showBack ? (
            <button
              type="button"
              onClick={onBack ?? (() => nav(-1))}
              className="aster-icon-btn"
              aria-label="back"
            >
              <ArrowLeft size={20} />
            </button>
          ) : null)}
      </div>
      <div className="flex-1 text-center text-base font-semibold tracking-[-0.01em]">{title}</div>
      <div className="w-10 flex items-center justify-end">{right}</div>
    </header>
  );
}

type SearchBarProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  onClick?: () => void;
};

export function AsterSearchBar({
  value,
  onChange,
  placeholder,
  readOnly = false,
  onClick,
}: SearchBarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex h-11 items-center gap-2.5 rounded-2xl border border-line bg-card px-4 text-sm text-text shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all cursor-pointer" onClick={onClick}>
      <Search size={17} className="text-primary" />
      <input
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder ?? t('discover.searchPair')}
        readOnly={readOnly}
        className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-textMute"
      />
    </div>
  );
}

export function SectionTitle({
  children,
  action,
  className = '',
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <h2 className="text-lg font-bold tracking-[-0.02em]">{children}</h2>
      {action}
    </div>
  );
}

export type SelectValue = string | number;

export interface AsterSelectOption {
  value: SelectValue;
  label: ReactNode;
  disabled?: boolean;
}

export function AsterSelect({
  value,
  options,
  onChange,
  placeholder,
  className = '',
  triggerClassName = '',
  panelClassName = '',
  renderValue,
}: {
  value: SelectValue;
  options: AsterSelectOption[];
  onChange: (value: SelectValue) => void;
  placeholder?: ReactNode;
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
  renderValue?: (option?: AsterSelectOption) => ReactNode;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((item) => item.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center rounded-lg border border-transparent bg-bgSoft px-3 text-left text-sm text-text outline-none ring-0 transition hover:border-line hover:bg-bg ${
          open ? 'border-line bg-bg shadow-card' : ''
        } ${triggerClassName}`}
      >
        <span className="min-w-0 flex-1 truncate">{renderValue ? renderValue(selected) : selected?.label ?? placeholder ?? t('common.selectPlaceholder')}</span>
        <ChevronDown
          size={17}
          className={`ml-3 shrink-0 text-textSub transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className={`aster-select-panel absolute left-0 right-0 top-[calc(100%+8px)] z-[80] max-h-72 overflow-y-auto rounded-xl border border-line bg-bg p-1 shadow-pop ${panelClassName}`}
        >
          {options.map((item) => {
            const active = item.value === value;
            return (
              <button
                key={String(item.value)}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) return;
                  onChange(item.value);
                  setOpen(false);
                }}
                className={`flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm ${
                  item.disabled
                    ? 'cursor-not-allowed text-textMute'
                    : active
                    ? 'bg-bgSoft font-semibold text-text shadow-card'
                    : 'text-text hover:bg-bgSoft'
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {active && <Check size={16} className="ml-3 shrink-0 text-text" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  desc,
  action,
}: {
  title?: string;
  desc?: string;
  action?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="py-12 text-center text-sm leading-6 text-textSub">
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-bgSoft shadow-card">
        <span className="text-2xl leading-none text-textMute">⌁</span>
      </div>
      <div className="font-semibold text-text">{title ?? t('common.noData')}</div>
      {desc && <div className="mt-2">{desc}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function BottomSheet({
  open,
  onClose,
  children,
  className = '',
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="close"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <section className={`aster-bottom-sheet absolute inset-x-0 bottom-0 mx-auto max-h-[82vh] w-full max-w-md rounded-t-[24px] border-t border-x border-line bg-card pb-safe shadow-pop ${className}`}>
        <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-lineSolid" />
        {children}
      </section>
    </div>,
    document.body
  );
}

const COIN_COLORS: Record<string, string> = {
  BTC: 'bg-[#F5A623] text-white',
  ETH: 'bg-[#F4F5F7] text-text',
  ATOM: 'bg-[#252849] text-white',
  SOL: 'bg-[#DFF7F2] text-[#15A984]',
  BCH: 'bg-[#8BC34A] text-white',
  XRP: 'bg-[#20252B] text-white',
  LTC: 'bg-[#356BA7] text-white',
  USDT: 'bg-[#27AE8A] text-white',
  USDC: 'bg-[#4A90E2] text-white',
  DOGE: 'bg-[#D7B34C] text-white',
  FIL: 'bg-[#39A9DC] text-white',
  TRX: 'bg-[#E94040] text-white',
};

type CoinVisualSize = 'sm' | 'md' | 'lg' | number;

function resolveCoinSize(size: CoinVisualSize = 'md') {
  if (typeof size === 'number') return size;
  if (size === 'lg') return 48;
  if (size === 'sm') return 28;
  return 36;
}

function resolveLogoUrl(value?: string | null) {
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

function CoinFallback({ coin, size = 'md' }: { coin?: string; size?: CoinVisualSize }) {
  const code = (coin || '?').slice(0, 4).toUpperCase();
  const px = resolveCoinSize(size);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${COIN_COLORS[code] ?? 'bg-bgSoft text-text'}`}
      style={{ width: px, height: px, fontSize: Math.max(10, Math.floor(px / 3)) }}
    >
      {code.slice(0, 1)}
    </span>
  );
}

function CoinSkeleton({ size = 'md' }: { size?: CoinVisualSize }) {
  const px = resolveCoinSize(size);
  return (
    <span
      className="inline-flex shrink-0 rounded-full bg-[#EEF1F4]"
      style={{ width: px, height: px }}
      aria-hidden="true"
    />
  );
}

function useResolvedCoinLogo(coin?: string, logo?: string | null) {
  const { logoMap, loading } = useCoinLogoMap();
  const normalizedCoin = coin?.trim().toUpperCase() ?? '';
  const cachedLogo = normalizedCoin ? (logoMap.get(normalizedCoin) ?? null) : null;

  return {
    logo: logo ?? cachedLogo,
    loading: loading && !logo,
  };
}

export function CoinIcon({
  coin,
  logo,
  size = 'md',
  loading = false,
}: {
  coin?: string;
  logo?: string | null;
  size?: CoinVisualSize;
  loading?: boolean;
}) {
  return <CoinLogo coin={coin} logo={logo} size={size} loading={loading} />;
}

export function CoinLogo({
  coin,
  logo,
  size = 'md',
  loading = false,
}: {
  coin?: string;
  logo?: string | null;
  size?: CoinVisualSize;
  loading?: boolean;
}) {
  const resolved = useResolvedCoinLogo(coin, logo);
  const [imgFailed, setImgFailed] = useState(false);
  const src = imgFailed ? '' : resolveLogoUrl(resolved.logo);
  const px = resolveCoinSize(size);

  useEffect(() => {
    setImgFailed(false);
  }, [coin, resolved.logo]);

  if ((loading || resolved.loading) && !src) {
    return <CoinSkeleton size={size} />;
  }

  if (!src) {
    return <CoinFallback coin={coin} size={size} />;
  }

  return (
    <img
      src={src}
      alt={coin || 'coin'}
      onError={() => setImgFailed(true)}
      className="shrink-0 rounded-full object-cover bg-white"
      style={{ width: px, height: px, border: '1px solid rgba(15, 23, 42, 0.08)' }}
    />
  );
}

export function PairCoinIcon({
  baseCoin,
  quoteCoin,
  baseLogo,
  quoteLogo,
  size = 'md',
  loading = false,
}: {
  baseCoin?: string;
  quoteCoin?: string;
  baseLogo?: string | null;
  quoteLogo?: string | null;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}) {
  const config =
    size === 'lg'
      ? { base: 48, quote: 28, wrapWidth: 60, wrapHeight: 48 }
      : size === 'sm'
      ? { base: 28, quote: 18, wrapWidth: 36, wrapHeight: 28 }
      : { base: 36, quote: 22, wrapWidth: 46, wrapHeight: 36 };

  return (
    <span
      className="relative inline-flex shrink-0"
      style={{ width: config.wrapWidth, height: config.wrapHeight }}
    >
      <span className="absolute left-0 top-0">
        <CoinLogo coin={baseCoin} logo={baseLogo} size={config.base} loading={loading} />
      </span>
      <span
        className="absolute bottom-0 right-0 rounded-full bg-white"
        style={{ padding: 1 }}
      >
        <CoinLogo coin={quoteCoin} logo={quoteLogo} size={config.quote} loading={loading} />
      </span>
    </span>
  );
}

export function QuoteChangeBadge({
  value,
  precision,
  compact = false,
}: {
  value: string | number | null | undefined;
  precision?: number;
  compact?: boolean;
}) {
  const n = parseFiniteNumber(value);
  const up = n !== null && n >= 0;
  return (
    <span
      className={`inline-flex items-center justify-center font-bold num transition-all ${
        compact ? 'h-7 min-w-[68px] rounded-lg px-2 text-[12px]' : 'h-8 min-w-[76px] rounded-xl px-2.5 text-[13px]'
      } ${
        n === null
          ? 'bg-bgSoft text-textSub border border-line'
          : up
          ? 'bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0]'
          : 'bg-[#FFF1F2] text-[#F43F5E] border border-[#FECDD3]'
      }`}
    >
      {formatChangePercent(n, precision)}
    </span>
  );
}
