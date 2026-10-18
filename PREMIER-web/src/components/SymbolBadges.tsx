import { useTranslation } from 'react-i18next';
import type { SymbolRow } from '@/api/quote';

const HOT_ICON_SRC = '/assets/hot.png';

function tradeTypeKey(tradeType: string): string {
  if (tradeType === 'perp') return 'nav.perp';
  if (tradeType === 'option') return 'nav.option';
  return 'nav.spot';
}

export function SymbolBadges({
  row,
  className = '',
  hotIconClassName = '',
  typeTextClassName = '',
  showSpot = false,
}: {
  row: Pick<SymbolRow, 'isHot' | 'tradeType'>;
  className?: string;
  hotIconClassName?: string;
  typeTextClassName?: string;
  showSpot?: boolean;
}) {
  const { t } = useTranslation();
  const isHot = Number(row.isHot) === 1;
  const isSpot = !row.tradeType || row.tradeType === 'spot';
  const showType = showSpot ? true : !isSpot;

  if (!showType && !isHot) return null;

  return (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap align-middle ${className}`}>
      {showType && (
        <span className={`inline-flex rounded-[4px] bg-[#FFF2D8] px-[4px] py-[1.5px] text-[9px] font-semibold leading-none text-[#F3A11A] ${typeTextClassName}`}>
          {t(tradeTypeKey(row.tradeType))}
        </span>
      )}
      {isHot ? (
        <span
          aria-label="热门"
          title="热门"
          className={`inline-flex items-center justify-center ${hotIconClassName}`}
        >
          <img src={HOT_ICON_SRC} alt="hot" className="h-[13px] w-[13px] object-contain" />
        </span>
      ) : null}
    </span>
  );
}
