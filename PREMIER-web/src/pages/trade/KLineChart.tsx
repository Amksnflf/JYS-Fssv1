import { useEffect, useRef, useState } from 'react';
import { createChart, type IChartApi, type ISeriesApi, type LineData, type Time } from 'lightweight-charts';
import { fetchKline } from '@/api/quote';
import { normalizeKlinePeriodForApi, periodSeconds } from './klinePeriods';

interface Props {
  alltickCode: string;
  period: string;
  livePrice?: string | null;
  height?: number;
  mainIndicator?: 'MA' | 'EMA' | 'BOLL' | 'NONE';
}

interface RawBar {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

function calcMA(data: RawBar[], periodCount: number): LineData[] {
  const result: LineData[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < periodCount - 1) continue;
    let sum = 0;
    for (let j = 0; j < periodCount; j++) {
      sum += data[i - j].close;
    }
    result.push({ time: data[i].time, value: sum / periodCount });
  }
  return result;
}

function calcEMA(data: RawBar[], periodCount: number): LineData[] {
  const result: LineData[] = [];
  if (data.length < periodCount) return result;
  const k = 2 / (periodCount + 1);
  let prevEma = data[0].close;
  result.push({ time: data[0].time, value: prevEma });
  for (let i = 1; i < data.length; i++) {
    const ema = data[i].close * k + prevEma * (1 - k);
    result.push({ time: data[i].time, value: ema });
    prevEma = ema;
  }
  return result;
}

function calcBOLL(data: RawBar[], periodCount = 20, multiplier = 2) {
  const upper: LineData[] = [];
  const mid: LineData[] = [];
  const lower: LineData[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < periodCount - 1) continue;
    let sum = 0;
    for (let j = 0; j < periodCount; j++) {
      sum += data[i - j].close;
    }
    const ma = sum / periodCount;
    let variance = 0;
    for (let j = 0; j < periodCount; j++) {
      variance += Math.pow(data[i - j].close - ma, 2);
    }
    const stdDev = Math.sqrt(variance / periodCount);
    mid.push({ time: data[i].time, value: ma });
    upper.push({ time: data[i].time, value: ma + stdDev * multiplier });
    lower.push({ time: data[i].time, value: ma - stdDev * multiplier });
  }
  return { upper, mid, lower };
}

export default function KLineChart({
  alltickCode,
  period,
  livePrice,
  height = 380,
  mainIndicator = 'MA',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lastBarRef = useRef<{ time: number; open: number; high: number; low: number; close: number } | null>(null);
  const rawBarsRef = useRef<RawBar[]>([]);

  // 指标 Series 引用
  const indicatorSeriesRef = useRef<ISeriesApi<'Line'>[]>([]);
  const [legendInfo, setLegendInfo] = useState<{
    type: 'MA' | 'EMA' | 'BOLL' | 'NONE';
    vals: { label: string; val: number | string; color: string }[];
  }>({ type: mainIndicator, vals: [] });

  // 1. 初始化 Chart
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { color: '#FFFFFF' },
        textColor: '#8C9BAE',
        fontFamily: 'SF Mono, PingFang SC, Inter, system-ui, sans-serif',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: '#F1F4F8' },
        horzLines: { color: '#F1F4F8' },
      },
      rightPriceScale: {
        borderColor: '#E8EEF3',
        scaleMargins: {
          top: 0.12,
          bottom: 0.12,
        },
      },
      timeScale: {
        borderColor: '#E8EEF3',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#94A3B8',
          width: 1,
          style: 3,
        },
        horzLine: {
          color: '#94A3B8',
          width: 1,
          style: 3,
        },
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#F43F5E',
      borderUpColor: '#10B981',
      borderDownColor: '#F43F5E',
      wickUpColor: '#10B981',
      wickDownColor: '#F43F5E',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const onResize = () => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      lastBarRef.current = null;
      indicatorSeriesRef.current = [];
    };
  }, [height]);

  // 2. 更新/渲染技术指标
  const updateIndicators = (bars: RawBar[]) => {
    if (!chartRef.current) return;

    // 清理旧指标 Series
    indicatorSeriesRef.current.forEach((s) => {
      try {
        chartRef.current?.removeSeries(s);
      } catch {}
    });
    indicatorSeriesRef.current = [];

    if (!bars.length || mainIndicator === 'NONE') {
      setLegendInfo({ type: 'NONE', vals: [] });
      return;
    }

    if (mainIndicator === 'MA') {
      const ma5 = calcMA(bars, 5);
      const ma10 = calcMA(bars, 10);
      const ma30 = calcMA(bars, 30);

      const s5 = chartRef.current.addLineSeries({ color: '#F59E0B', lineWidth: 1, priceLineVisible: false });
      const s10 = chartRef.current.addLineSeries({ color: '#8B5CF6', lineWidth: 1, priceLineVisible: false });
      const s30 = chartRef.current.addLineSeries({ color: '#00C4DF', lineWidth: 1, priceLineVisible: false });

      s5.setData(ma5);
      s10.setData(ma10);
      s30.setData(ma30);

      indicatorSeriesRef.current = [s5, s10, s30];

      const last5 = ma5[ma5.length - 1]?.value;
      const last10 = ma10[ma10.length - 1]?.value;
      const last30 = ma30[ma30.length - 1]?.value;

      setLegendInfo({
        type: 'MA',
        vals: [
          { label: 'MA(5)', val: last5 ? last5.toFixed(2) : '--', color: '#F59E0B' },
          { label: 'MA(10)', val: last10 ? last10.toFixed(2) : '--', color: '#8B5CF6' },
          { label: 'MA(30)', val: last30 ? last30.toFixed(2) : '--', color: '#00C4DF' },
        ],
      });
    } else if (mainIndicator === 'EMA') {
      const ema7 = calcEMA(bars, 7);
      const ema25 = calcEMA(bars, 25);

      const s7 = chartRef.current.addLineSeries({ color: '#F59E0B', lineWidth: 1, priceLineVisible: false });
      const s25 = chartRef.current.addLineSeries({ color: '#00C4DF', lineWidth: 1, priceLineVisible: false });

      s7.setData(ema7);
      s25.setData(ema25);

      indicatorSeriesRef.current = [s7, s25];

      const last7 = ema7[ema7.length - 1]?.value;
      const last25 = ema25[ema25.length - 1]?.value;

      setLegendInfo({
        type: 'EMA',
        vals: [
          { label: 'EMA(7)', val: last7 ? last7.toFixed(2) : '--', color: '#F59E0B' },
          { label: 'EMA(25)', val: last25 ? last25.toFixed(2) : '--', color: '#00C4DF' },
        ],
      });
    } else if (mainIndicator === 'BOLL') {
      const { upper, mid, lower } = calcBOLL(bars, 20, 2);

      const sUp = chartRef.current.addLineSeries({ color: '#8B5CF6', lineWidth: 1, priceLineVisible: false });
      const sMid = chartRef.current.addLineSeries({ color: '#F59E0B', lineWidth: 1, priceLineVisible: false });
      const sDn = chartRef.current.addLineSeries({ color: '#8B5CF6', lineWidth: 1, priceLineVisible: false });

      sUp.setData(upper);
      sMid.setData(mid);
      sDn.setData(lower);

      indicatorSeriesRef.current = [sUp, sMid, sDn];

      const lastUp = upper[upper.length - 1]?.value;
      const lastMid = mid[mid.length - 1]?.value;
      const lastDn = lower[lower.length - 1]?.value;

      setLegendInfo({
        type: 'BOLL',
        vals: [
          { label: 'UP', val: lastUp ? lastUp.toFixed(2) : '--', color: '#8B5CF6' },
          { label: 'MB', val: lastMid ? lastMid.toFixed(2) : '--', color: '#F59E0B' },
          { label: 'DN', val: lastDn ? lastDn.toFixed(2) : '--', color: '#8B5CF6' },
        ],
      });
    }
  };

  // 3. 拉取 K 线
  useEffect(() => {
    if (!alltickCode || !seriesRef.current) return;
    let cancel = false;
    fetchKline(alltickCode, normalizeKlinePeriodForApi(period), 200)
      .then((bars) => {
        if (cancel || !seriesRef.current) return;
        const data: RawBar[] = (bars ?? [])
          .map((b) => ({
            time: Math.floor(b.time / 1000) as Time,
            open: Number(b.open),
            high: Number(b.high),
            low: Number(b.low),
            close: Number(b.close),
          }))
          .filter((b) => [b.open, b.high, b.low, b.close].every((v) => isFinite(v)))
          .sort((a, b) => (a.time as number) - (b.time as number));

        rawBarsRef.current = data;
        seriesRef.current.setData(data);
        updateIndicators(data);

        if (data.length) {
          const last = data[data.length - 1];
          lastBarRef.current = {
            time: last.time as number,
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close,
          };
          chartRef.current?.timeScale().fitContent();
        }
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [alltickCode, period, mainIndicator]);

  // 4. 实时价更新最后一根 K 线
  useEffect(() => {
    if (!livePrice || !seriesRef.current || !lastBarRef.current) return;
    const p = Number(livePrice);
    if (!isFinite(p) || p <= 0) return;
    const step = periodSeconds(period);
    const now = Math.floor(Date.now() / 1000);
    const aligned = now - (now % step);
    const bar = lastBarRef.current;

    if (aligned > bar.time) {
      const nextBar = {
        time: aligned,
        open: bar.close,
        high: Math.max(bar.close, p),
        low: Math.min(bar.close, p),
        close: p,
      };
      lastBarRef.current = nextBar;
      seriesRef.current.update({
        time: nextBar.time as Time,
        open: nextBar.open,
        high: nextBar.high,
        low: nextBar.low,
        close: nextBar.close,
      });
      return;
    }

    bar.close = p;
    if (p > bar.high) bar.high = p;
    if (p < bar.low) bar.low = p;
    seriesRef.current.update({
      time: bar.time as Time,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    });
  }, [livePrice, period]);

  return (
    <div className="relative w-full" style={{ height }}>
      {legendInfo.vals.length > 0 && (
        <div className="pointer-events-none absolute left-2.5 top-2 z-10 flex max-w-[72%] flex-wrap items-center gap-2 rounded bg-white/85 px-1.5 py-0.5 text-[10px] font-mono shadow-xs backdrop-blur-xs">
          {legendInfo.vals.map((item, i) => (
            <span key={i} style={{ color: item.color }} className="font-semibold whitespace-nowrap">
              {item.label}: {item.val}
            </span>
          ))}
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height }} />
    </div>
  );
}
