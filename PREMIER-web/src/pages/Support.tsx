import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { tutorials } from '@/data/tutorials';
import { useResponsive } from '@/hooks/useResponsive';
import { PcContainer } from '@/components/pc';
import { brandName } from '@/brand';

export default function SupportPage() {
  const { t } = useTranslation();
  const { isPc } = useResponsive();

  if (isPc) {
    return (
      <div className="bg-bg py-10 text-text">
        <PcContainer>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="pc-h2 m-0">{t('support.tutorial')}</h1>
              <p className="mt-3 text-[14px] text-textSubPc">{brandName} Help Center</p>
            </div>
          </div>
          <div className="mt-8 rounded-lg border border-line bg-bg">
            {tutorials.map((item, index) => (
              <Link
                key={item.id}
                to={`/support/${item.id}`}
                className={`flex min-h-[64px] items-center justify-between px-6 text-[15px] font-medium text-text transition hover:bg-hoverBg ${
                  index % 2 === 1 ? 'bg-bgSection' : 'bg-bg'
                }`}
              >
                <span className="line-clamp-1 pr-4">{t(`tutorials.${item.id}.title`)}</span>
                <ChevronRight size={20} className="shrink-0 text-textSubPc" />
              </Link>
            ))}
          </div>
        </PcContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-12 md:bg-[#3c3c3c] md:py-6">
      <div className="mx-auto min-h-screen w-full max-w-md bg-bg">
        <PageHeader title={t('support.tutorial')} fallbackPath="/profile" />
        <div>
          {tutorials.map((item, index) => (
            <Link
              key={item.id}
              to={`/support/${item.id}`}
              className={`fade-in-bottom flex min-h-[72px] items-center justify-between px-7 text-[15px] font-medium leading-6 text-text ${
                index % 2 === 1 ? 'bg-[#f2f2f2]' : 'bg-bg'
              }`}
            >
              <span className="line-clamp-1 pr-4">{t(`tutorials.${item.id}.title`)}</span>
              <ChevronRight size={22} className="shrink-0 text-[#666]" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
