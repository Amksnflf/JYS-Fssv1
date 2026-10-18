export function normalizePrecision(precision?: number | null, fallback = 2): number {
  if (!Number.isFinite(precision)) return fallback;
  return Math.min(8, Math.max(0, Math.floor(Number(precision))));
}

export function parseFiniteNumber(value: number | string | undefined | null): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatChangePercent(value: number | string | undefined | null, precision?: number | null): string {
  const n = parseFiniteNumber(value);
  if (n === null) return '--';
  const digits = normalizePrecision(precision, 2);
  const text = n.toFixed(digits);
  return `${n >= 0 ? '+' : ''}${text}%`;
}
