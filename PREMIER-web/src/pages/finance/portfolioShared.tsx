import { ReactNode, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Square } from 'lucide-react';
import type { PortfolioProduct } from '@/api/finance';
import { CoinLogo } from '@/components/AsterUI';

export function PortfolioHeader({
  title,
  right,
  onBack,
}: {
  title?: string;
  right?: ReactNode;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur">
      <button onClick={onBack} className="flex h-9 w-9 items-center justify-start" aria-label="back">
        <ChevronLeft size={22} />
      </button>
      <div className="text-[16px] font-semibold">{title ?? t('discover.portfolio')}</div>
      <div className="flex h-9 min-w-9 items-center justify-end text-[13px] font-medium text-[#2F7D32]">{right}</div>
    </header>
  );
}

export function PortfolioChart({ seed = 0, height = 190 }: { seed?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') return;

    let state = (Number(seed) || 1) * 2654435761;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };

    const dpr = window.devicePixelRatio || 1;
    let frame = 0;
    let start = 0;
    let width = 0;
    let chartHeight = 0;
    let points: Array<{ x: number; y: number }> = [];

    const buildPoints = (nextWidth: number, nextHeight: number) => {
      const count = Math.max(12, Math.round(nextWidth / 18));
      const baseHeight = nextHeight * 0.9;
      let cursor = 0.66;
      const result: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < count; i += 1) {
        cursor += (random() - 0.5) * 0.55;
        cursor = Math.min(Math.max(cursor, 0.18), 0.92);
        result.push({
          x: (nextWidth / (count - 1)) * i,
          y: cursor * baseHeight,
        });
      }
      return result;
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
      const ctx = canvas.getContext('2d');
      if (!ctx || points.length === 0) return;

      ctx.clearRect(0, 0, width, chartHeight);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, chartHeight);

      ctx.fillStyle = '#D8FFF1';
      ctx.fillRect(0, 0, width, chartHeight * 0.9);

      ctx.fillStyle = 'rgba(71, 214, 149, 0.28)';
      for (let x = 0; x < width; x += 10) {
        for (let y = 0; y < chartHeight * 0.9; y += 10) {
          ctx.fillRect(x + 3, y + 3, 3, 3);
        }
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width * progress, chartHeight);
      ctx.clip();

      ctx.beginPath();
      ctx.moveTo(points[0].x, chartHeight * 0.9);
      drawLine(ctx);
      ctx.lineTo(points[points.length - 1].x, chartHeight * 0.9);
      ctx.closePath();
      ctx.fillStyle = 'rgba(48, 216, 133, 0.12)';
      ctx.fill();

      ctx.beginPath();
      drawLine(ctx);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#2ED98B';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(46, 217, 139, 0.18)';
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.restore();
    };

    const render = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, Math.floor(bounds.width));
      chartHeight = Math.max(1, Math.floor(bounds.height || height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(chartHeight * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      points = buildPoints(width, chartHeight);
      start = 0;
      cancelAnimationFrame(frame);
      const tick = (time: number) => {
        if (!start) start = time;
        const progress = Math.min((time - start) / 1100, 1);
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
  }, [height, seed]);

  return <canvas ref={canvasRef} className="block h-full w-full" style={{ minHeight: height }} aria-hidden="true" />;
}

export function CoinBubble({
  coin,
  logo,
  size = 44,
  loading = false,
}: {
  coin: string;
  logo?: string | null;
  size?: number;
  loading?: boolean;
}) {
  return <CoinLogo coin={coin} logo={logo} size={size} loading={loading && !logo} />;
}

export function CoinStack({
  coins,
  logoMap,
  size = 28,
  loading = false,
}: {
  coins: string[];
  logoMap?: Map<string, string | null>;
  size?: number;
  loading?: boolean;
}) {
  return (
    <span className="flex -space-x-2">
      {coins.map((coin) => (
        <span key={coin} className="inline-flex shrink-0 rounded-full ring-2 ring-bgSoft">
          <CoinBubble coin={coin} logo={logoMap?.get(coin.toUpperCase())} size={size} loading={loading} />
        </span>
      ))}
    </span>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-[15px] font-semibold">
      <Square size={10} className="fill-text text-text" />
      {children}
    </h2>
  );
}

export function splitCoins(product: PortfolioProduct) {
  return product.coins.split(',').map((coin) => coin.trim()).filter(Boolean);
}

export function portfolioDailyPct(product: PortfolioProduct) {
  return (Number(product.dailyRate || 0) * 100).toFixed(1).replace(/\.0$/, '');
}

const PORTFOLIO_NAME_TRANSLATIONS: Record<string, Record<string, string>> = {
  'Steady Select Portfolio': {
    'zh-CN': '稳健精选组合',
    'zh-TW': '穩健精選組合',
    'ja': '安定厳選ポートフォリオ',
    'ko': '안정형 셀렉트 포트폴리오',
    'ru': 'Портфель стабильного выбора',
    'de': 'Stables Auswahl-Portfolio',
    'fr': 'Portefeuille Sélection Stable',
    'es': 'Cartera Selección Estable',
    'vi': 'Danh mục chọn lọc ổn định',
    'th': 'พอร์ตคัดสรรผลตอบแทนมั่นคง',
    'id': 'Portofolio Pilihan Stabil',
    'pt-BR': 'Carteira Seleção Estável',
    'tr': 'İstikrarlı Seçim Portföyü',
    'ar': 'محفظة الاختيار المستقر',
    'en': 'Steady Select Portfolio',
  },
  'DeFi Yield Portfolio': {
    'zh-CN': 'DeFi收益组合',
    'zh-TW': 'DeFi收益組合',
    'ja': 'DeFi利回りポートフォリオ',
    'ko': 'DeFi 수익 포트폴리오',
    'ru': 'Портфель доходности DeFi',
    'de': 'DeFi-Ertrags-Portfolio',
    'fr': 'Portefeuille Rendement DeFi',
    'es': 'Cartera de Rendimiento DeFi',
    'vi': 'Danh mục lợi nhuận DeFi',
    'th': 'พอร์ตผลตอบแทน DeFi',
    'id': 'Portofolio Hasil DeFi',
    'pt-BR': 'Carteira Rendimento DeFi',
    'tr': 'DeFi Getiri Portföyü',
    'ar': 'محفظة عوائد DeFi',
    'en': 'DeFi Yield Portfolio',
  },
  'Blue-Chip Rotation Portfolio': {
    'zh-CN': '蓝筹轮动组合',
    'zh-TW': '藍籌輪動組合',
    'ja': 'ブルーチップ循環ポートフォリオ',
    'ko': '블루칩 로테이션 포트폴리오',
    'ru': 'Портфель ротации голубых фишек',
    'de': 'Blue-Chip Rotations-Portfolio',
    'fr': 'Portefeuille Rotation Blue-Chip',
    'es': 'Cartera Rotación Blue-Chip',
    'vi': 'Danh mục luân chuyển Blue-Chip',
    'th': 'พอร์ตหมุนเวียนบลูชิป',
    'id': 'Portofolio Rotasi Blue-Chip',
    'pt-BR': 'Carteira Rotação Blue-Chip',
    'tr': 'Mavi Çip Rotasyon Portföyü',
    'ar': 'محفظة تدوير الأسهم القيادية',
    'en': 'Blue-Chip Rotation Portfolio',
  },
};

export function getPortfolioDisplayName(name: string, lang = 'en', t?: (key: string) => string): string {
  if (!name) return '';
  const item = PORTFOLIO_NAME_TRANSLATIONS[name];
  if (item) {
    if (item[lang]) return item[lang];
    const prefix = lang.split('-')[0];
    if (item[prefix]) return item[prefix];
  }
  if (t) {
    const i18nKey = `portfolio.${name}`;
    const val = t(i18nKey);
    if (val && val !== i18nKey) return val;
  }
  return name;
}

