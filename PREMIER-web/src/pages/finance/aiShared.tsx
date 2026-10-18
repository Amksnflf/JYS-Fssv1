import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bot, Coins, Crown, User, X } from 'lucide-react';
import { fetchOverview, type AssetOverview } from '@/api/asset';
import { startAiStrategy, type AiStrategy } from '@/api/finance';
import { CoinLogo } from '@/components/AsterUI';
import { toast } from '@/components/Toast';

export type AiMeta = {
  pair: string;
  leftCoin: string;
  rightCoin: string;
  runTime: string;
  gridRate: string;
  minValue: string;
  maxServiceFee: string;
  day3: string;
  day7: string;
  day10: string;
  followerFund: string;
};

const META_PRESETS: Record<string, Partial<AiMeta>> = {
  'BTC/USDT': {
    runTime: '--',
    gridRate: '0.9%',
    maxServiceFee: '0.6%',
    day3: '2.2%',
    day7: '3.8%',
    day10: '5%',
    followerFund: '18,426',
  },
  'XTZ/ATA': {
    runTime: '1d',
    gridRate: '0.7%',
    maxServiceFee: '0.4%',
    day3: '1.1%',
    day7: '2.1%',
    day10: '2.9%',
    followerFund: '23,518',
  },
  'KNC/ATA': {
    runTime: '1d',
    gridRate: '0.8%',
    maxServiceFee: '0.5%',
    day3: '1.4%',
    day7: '2.7%',
    day10: '3.9%',
    followerFund: '11,297',
  },
  'TRX/DAI': {
    runTime: '18h',
    gridRate: '0.8%',
    maxServiceFee: '0.5%',
    day3: '1.8%',
    day7: '3.2%',
    day10: '4.8%',
    followerFund: '9,864',
  },
};

function asPercent(value: number, precision = 1) {
  return `${(value * 100).toFixed(precision).replace(/\.0$/, '')}%`;
}

function hashSeed(input: string | number) {
  const text = String(input);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function deriveAiMeta(s: AiStrategy): AiMeta {
  const [left = 'AI', right = 'USDT'] = s.name.split('/');
  const pair = `${left.toUpperCase()}/${right.toUpperCase()}`;
  const preset = META_PRESETS[pair] ?? {};
  const apr = Number(s.maxApr || 0);
  const minAmount = Number(s.minAmount || 0);

  return {
    pair,
    leftCoin: left.toUpperCase(),
    rightCoin: right.toUpperCase(),
    runTime: preset.runTime ?? (pair.includes('BTC/') ? '--' : '1d'),
    gridRate: preset.gridRate ?? `${Math.max(0.4, apr * 12).toFixed(1)}%`,
    minValue: Number.isFinite(minAmount) && minAmount > 0 ? `>${minAmount.toFixed(0)}` : preset.minValue ?? '--',
    maxServiceFee: preset.maxServiceFee ?? '0.5%',
    day3: preset.day3 ?? asPercent(apr * 0.46),
    day7: preset.day7 ?? asPercent(apr * 0.78),
    day10: preset.day10 ?? asPercent(apr || 0),
    followerFund: preset.followerFund ?? (Number.isFinite(minAmount) && minAmount > 0 ? `>${Math.round(minAmount * 12)}` : '--'),
  };
}

export function percentText(value: string | number, precision = 1) {
  return `${(Number(value || 0) * 100).toFixed(precision).replace(/\.0$/, '')}%`;
}

export function maskAccount(account?: string) {
  if (!account) return '--';
  if (account.includes('@')) {
    const [name, domain] = account.split('@');
    return `${name.slice(0, 3)}***@${domain}`;
  }
  return `${account.slice(0, 3)}***${account.slice(-2)}`;
}

export function StrategyIcon({
  strategy,
  size = 40,
  logoMap,
  loading = false,
}: {
  strategy: AiStrategy;
  size?: number;
  logoMap?: Map<string, string | null>;
  loading?: boolean;
}) {
  const meta = deriveAiMeta(strategy);
  const mainLogo = logoMap?.get(meta.leftCoin.toUpperCase());
  const subLogo = logoMap?.get(meta.rightCoin.toUpperCase());
  const twoCoins = !['ATA', 'USDT'].includes(meta.rightCoin.toUpperCase());

  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <CoinLogo coin={meta.leftCoin} logo={mainLogo} size={size} loading={loading && !mainLogo} />
      {twoCoins && (
        <span
          className="absolute -right-1 top-1/2 inline-flex h-[62%] w-[62%] -translate-y-1/2 items-center justify-center rounded-full ring-2 ring-white"
        >
          <CoinLogo
            coin={meta.rightCoin}
            logo={subLogo}
            size={Math.round(size * 0.62)}
            loading={loading && !subLogo}
          />
        </span>
      )}
    </span>
  );
}

export function MiniStrategyChart({ seed = 0, height = 66 }: { seed?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') return;

    const seedValue = hashSeed(seed);
    const random = createSeededRandom(seedValue);
    const dpr = window.devicePixelRatio || 1;
    let frame = 0;
    let start = 0;
    let points: Array<{ x: number; y: number }> = [];
    let width = 0;
    let chartHeight = 0;

    const buildPoints = (nextWidth: number, nextHeight: number) => {
      const count = Math.max(22, Math.round(nextWidth / 9));
      const list: Array<{ x: number; y: number }> = [];
      const drawableHeight = nextHeight * 0.78;
      let cursor = 0.56 + (random() - 0.5) * 0.22;
      for (let i = 0; i < count; i += 1) {
        cursor += (random() - 0.5) * 0.46;
        cursor = Math.min(Math.max(cursor, 0.08), 0.9);
        list.push({
          x: (nextWidth / (count - 1)) * i,
          y: cursor * drawableHeight,
        });
      }
      return list;
    };

    const drawLine = (ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i += 1) {
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    };

    const paint = (progress: number) => {
      const context = canvas.getContext('2d');
      if (!context || points.length === 0) return;

      context.clearRect(0, 0, width, chartHeight);
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, width, chartHeight);

      context.fillStyle = '#E6FFF0';
      context.fillRect(0, 0, width, chartHeight * 0.88);

      context.fillStyle = 'rgba(33, 196, 114, 0.24)';
      for (let x = 0; x < width; x += 6) {
        context.fillRect(x, 0, 3, chartHeight * 0.88);
      }

      context.save();
      context.beginPath();
      context.rect(0, 0, width * progress, chartHeight * 0.88);
      context.clip();

      context.beginPath();
      context.moveTo(points[0].x, chartHeight * 0.88);
      drawLine(context);
      context.lineTo(points[points.length - 1].x, chartHeight * 0.88);
      context.closePath();
      context.fillStyle = 'rgba(33, 196, 114, 0.13)';
      context.fill();

      context.beginPath();
      drawLine(context);
      context.lineWidth = 2.2;
      context.strokeStyle = '#1FD06E';
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.shadowColor = 'rgba(31, 208, 110, 0.18)';
      context.shadowBlur = 5;
      context.stroke();
      context.restore();
    };

    const render = () => {
      const bounds = canvas.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.floor(bounds.width));
      const nextHeight = Math.max(1, Math.floor(bounds.height || height));
      width = nextWidth;
      chartHeight = nextHeight;
      canvas.width = Math.floor(nextWidth * dpr);
      canvas.height = Math.floor(nextHeight * dpr);
      const context = canvas.getContext('2d');
      if (!context) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      points = buildPoints(nextWidth, nextHeight);
      start = 0;
      cancelAnimationFrame(frame);
      const tick = (time: number) => {
        if (!start) start = time;
        const progress = Math.min((time - start) / 1200, 1);
        paint(progress);
        if (progress < 1) frame = window.requestAnimationFrame(tick);
      };
      frame = window.requestAnimationFrame(tick);
    };

    render();

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => render()) : null;
    observer?.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [canvasRef, height, seed]);

  return <canvas ref={canvasRef} className="block h-full w-full" style={{ minHeight: height }} aria-hidden="true" />;
}

export function AiSubscribeSheet({
  strategy,
  open,
  onClose,
}: {
  strategy: AiStrategy | null;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [overview, setOverview] = useState<AssetOverview | null>(null);
  const [amount, setAmount] = useState('');
  const [percent, setPercent] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setPercent(0);
    fetchOverview().then(setOverview).catch(() => {});
  }, [open]);

  const available = useMemo(() => {
    return overview?.accounts.find((a) => a.accountType === 1 && a.coin === 'USDT')?.available ?? '0';
  }, [overview]);

  const setByPercent = (value: number) => {
    setPercent(value);
    const next = (Number(available) * value) / 100;
    setAmount(next > 0 ? next.toFixed(2) : '');
  };

  const submit = async () => {
    if (!strategy) return;
    if (!amount || Number(amount) <= 0) {
      toast.error(t('aiFinance.investRequired'));
      return;
    }
    setSubmitting(true);
    try {
      await startAiStrategy(strategy.id, amount);
      toast.success(t('aiFinance.started'));
      onClose();
      nav('/finance/ai/orders');
    } catch (e: any) {
      toast.error(e?.message ?? t('aiFinance.startFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !strategy) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <button className="absolute inset-0 bg-black/65" aria-label="close" onClick={onClose} />
      <section className="aster-bottom-sheet absolute inset-x-0 bottom-0 mx-auto max-w-md bg-bg px-4 pb-safe pt-2">
        <div className="mx-auto h-1 w-8 rounded-full bg-line" />
        <div className="relative mt-3 text-center text-base font-medium">{t('finance.strategyAmount')}</div>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-text text-bg"
          aria-label="close"
        >
          <X size={18} />
        </button>

        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder={t('finance.strategyAmount')}
          className="mt-7 h-[54px] w-full rounded-lg border border-line px-5 text-base outline-none placeholder:text-textSub"
        />

        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={percent}
          onChange={(e) => setByPercent(Number(e.target.value))}
          className="mt-7 w-full accent-text"
        />
        <div className="mt-5 flex justify-between text-sm">
          {[0, 25, 50, 75, 100].map((p) => (
            <button key={p} type="button" onClick={() => setByPercent(p)}>
              {p}%
            </button>
          ))}
        </div>

        <div className="mt-7 flex items-center justify-between text-sm">
          <span>{t('aiFinance.currentBalance')}</span>
          <span className="num">{Number(available).toFixed(2).replace(/\.00$/, '')}</span>
        </div>

        <button
          disabled={submitting}
          onClick={submit}
          className="btn-primary mt-6 w-full disabled:opacity-60"
        >
          {t('common.confirm')}
        </button>
      </section>
    </div>,
    document.body
  );
}

export function StatPill({ icon, label, value }: { icon: 'user' | 'coin'; label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5 text-sm font-medium">
        {icon === 'user' ? <Bot size={17} className="fill-up text-up" /> : <Coins size={17} className="text-up" />}
        <span>{label}</span>
      </div>
      <div className="num mt-2 text-2xl font-medium">{value}</div>
    </div>
  );
}

export function LevelBadge({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[#D6A536]">
      <Crown size={17} className="fill-[#F7D92E] text-[#F7D92E]" />
      L{level}
    </span>
  );
}

export function PcStrategyCard({
  strategy,
  logoMap,
  coinLogoLoading,
  onOpen,
  onUse,
}: {
  strategy: AiStrategy;
  logoMap?: Map<string, string | null>;
  coinLogoLoading?: boolean;
  onOpen?: () => void;
  onUse: () => void;
}) {
  const { t } = useTranslation();
  const meta = deriveAiMeta(strategy);
  return (
    <article className="transition hover:-translate-y-0.5">
      <button
        type="button"
        className="w-full overflow-hidden rounded-[22px] border border-line bg-bg text-left shadow-pcCard"
        onClick={onOpen}
      >
        <div className="flex items-center justify-between px-6 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <StrategyIcon strategy={strategy} size={40} logoMap={logoMap} loading={coinLogoLoading} />
            <span className="text-[18px] font-semibold text-text">{meta.pair}</span>
          </div>
          <span className="text-[13px] text-textSubPc">{strategy.strategyType}</span>
        </div>
        <div className="h-[88px] bg-[#E6FFF0]">
          <MiniStrategyChart seed={strategy.id} height={88} />
        </div>
      </button>
      <div className="px-3 pb-2 pt-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
          <div>
            <div className="truncate text-[11px] font-medium text-textSubPc leading-normal" title={t('aiFinance.maxApr')}>
              {t('aiFinance.maxApr')}
            </div>
            <div className="num mt-0.5 text-[15px] font-bold pc-up-text">
              {percentText(strategy.maxApr)}
            </div>
          </div>
          <div className="border-l border-line/60 pl-4">
            <div className="truncate text-[11px] font-medium text-textSubPc leading-normal" title={t('aiFinance.maxDrawdown')}>
              {t('aiFinance.maxDrawdown')}
            </div>
            <div className="num mt-0.5 text-[15px] font-bold text-text">
              {percentText(strategy.maxDrawdown)}
            </div>
          </div>
          <div>
            <div className="truncate text-[11px] font-medium text-textSubPc leading-normal" title={t('aiFinance.investAmount')}>
              {t('aiFinance.investAmount')}
            </div>
            <div className="num mt-0.5 text-[13px] font-semibold text-text">
              {`> ${Number(strategy.minAmount).toFixed(0)} USDT`}
            </div>
          </div>
          <div className="border-l border-line/60 pl-4">
            <div className="truncate text-[11px] font-medium text-textSubPc leading-normal" title={t('aiFinance.runTime')}>
              {t('aiFinance.runTime')}
            </div>
            <div className="num mt-0.5 text-[13px] font-semibold text-text">
              {meta.runTime}
            </div>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-4 text-[13px]">
            <LevelBadge level={strategy.levelRequired || 0} />
            <span className="flex items-center gap-1.5 text-textSubPc">
              <User size={16} className="fill-primary text-primary" />
              <span className="num pc-price font-medium text-text">{strategy.userCount}</span>
            </span>
          </div>
          <button type="button" onClick={onUse} className="pc-btn-dark">
            {t('common.use')}
          </button>
        </div>
      </div>
    </article>
  );
}
