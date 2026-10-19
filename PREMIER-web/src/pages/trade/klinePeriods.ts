export const KLINE_PERIODS = [
  { v: '1m', labelKey: 'kline.periodTime' },
  { v: '1m-line', labelKey: 'kline.period1m' },
  { v: '5m', labelKey: 'kline.period5m' },
  { v: '15m', labelKey: 'kline.period15m' },
  { v: '30m', labelKey: 'kline.period30m' },
  { v: '1d', labelKey: 'kline.period1d' },
  { v: '1w', labelKey: 'kline.period1w' },
  { v: '1mo', labelKey: 'kline.period1mo' },
] as const;

export type KlinePeriod = (typeof KLINE_PERIODS)[number]['v'];

export function normalizeKlinePeriodForApi(period: string): string {
  if (period === '1m-line') return '1m';
  if (period === '1mo') return '1M';
  return period;
}

export function periodSeconds(period: string): number {
  switch (normalizeKlinePeriodForApi(period)) {
    case '1m':
      return 60;
    case '5m':
      return 5 * 60;
    case '15m':
      return 15 * 60;
    case '30m':
      return 30 * 60;
    case '1h':
      return 60 * 60;
    case '2h':
      return 2 * 60 * 60;
    case '4h':
      return 4 * 60 * 60;
    case '1d':
      return 24 * 60 * 60;
    case '1w':
      return 7 * 24 * 60 * 60;
    case '1M':
    case '1mo':
      return 30 * 24 * 60 * 60;
    default:
      return 60;
  }
}
