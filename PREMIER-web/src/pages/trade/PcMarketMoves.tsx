import { useTranslation } from 'react-i18next';
import type { SymbolRow } from '@/api/quote';

function formatPrice(value: string | number | null | undefined, precision = 2): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '--';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: Math.min(precision, 8),
    maximumFractionDigits: Math.min(precision, 8),
  });
}

export default function PcMarketMoves({ rows }: { rows: SymbolRow[] }) {
  const { t } = useTranslation();
  return (
    <div className="text-[11px]">
      <div className="mb-2 flex items-center justify-between text-[12px] font-semibold text-text">
        <span>{t('market.dynamicTitle')}</span>
        <span className="text-[10px] font-normal text-textSubPc">{t('common.all')}</span>
      </div>
      <div className="space-y-1">
        {rows.slice(0, 10).map((row) => {
          const change = Number(row.change ?? 0);
          const up = change >= 0;
          return (
            <div key={`${row.tradeType}-${row.symbol}-${row.alltickCode}`} className="grid grid-cols-[58px_1fr_54px] items-center gap-2">
              <span className="truncate font-semibold text-text">{row.baseCoin}</span>
              <span className="text-right pc-price text-text">{formatPrice(row.price, row.pricePrecision)}</span>
              <span className={`text-right pc-price ${up ? 'pc-up-text' : 'pc-down-text'}`}>
                {up ? '+' : ''}{formatPrice(change, row.changePrecision ?? 2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
