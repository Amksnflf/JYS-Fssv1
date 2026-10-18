import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { LevelBadge } from './aiShared';

const RULES = [
  { level: 1, deposit: '100USDT', times: 1 },
  { level: 2, deposit: '300USDT', times: 2 },
  { level: 3, deposit: '1000USDT', times: 3 },
  { level: 4, deposit: '3,000USDT', times: 4 },
  { level: 5, deposit: '5,000USDT', times: 5 },
  { level: 6, deposit: '8,000USDT', times: 6 },
  { level: 7, deposit: '15,000USDT', times: 7 },
];

export default function AiRulesPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  return (
    <div className="mx-auto min-h-screen max-w-md bg-bg pb-10">
      <header className="sticky top-0 z-30 flex h-[74px] items-center justify-between border-b border-line bg-bg/95 px-4 backdrop-blur">
        <button className="flex h-10 w-10 items-center justify-start" onClick={() => nav('/finance')} aria-label="back">
          <ChevronLeft size={25} />
        </button>
        <div className="text-lg font-semibold">{t('finance.teamLevelRules')}</div>
        <div className="w-10" />
      </header>

      <main className="grid grid-cols-2 gap-4 px-4 pt-5">
        {RULES.map((rule) => (
          <article key={rule.level} className="overflow-hidden rounded-xl border border-line bg-bg shadow-[0_3px_14px_rgba(0,0,0,0.05)]">
            <div className="flex h-[64px] items-center gap-2 border-b border-line px-5 text-base font-medium">
              <LevelBadge level={rule.level} />
              {rule.level === 1 && <span className="text-sm text-[#2F7D32]">{t('finance.currentLevel')}</span>}
            </div>
            <p className="px-5 py-6 text-[15px] leading-7">
              L{rule.level} to quality withdraw, deposit {rule.deposit} &amp; generate {rule.times} time AI strategy.
            </p>
          </article>
        ))}
      </main>
    </div>
  );
}
