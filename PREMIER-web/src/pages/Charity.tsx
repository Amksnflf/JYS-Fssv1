import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/PageHeader';
import { useResponsive } from '@/hooks/useResponsive';
import { PcContainer } from '@/components/pc';
import { brandName } from '@/brand';

export default function CharityPage() {
  const { t } = useTranslation();
  const { isPc } = useResponsive();
  const projects = [
    [t('charity.educationTitle'), t('charity.educationDesc')],
    [t('charity.disasterTitle'), t('charity.disasterDesc')],
    [t('charity.environmentTitle'), t('charity.environmentDesc')],
  ];

  if (isPc) {
    return (
      <div className="bg-bg py-12 text-text">
        <PcContainer>
          <div className="rounded-lg border border-line bg-bg p-8">
            <h1 className="pc-h2 m-0">{t('charity.title')}</h1>
            <div className="mt-8 rounded-lg bg-bgSection p-6">
              <div className="text-[22px] font-semibold text-primary">{brandName} Charity</div>
              <p className="mt-3 text-[15px] leading-7 text-textSubPc">
                {t('charity.desc')}
              </p>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-5">
              {projects.map(([title, desc]) => (
                <div key={title} className="rounded-lg border border-line bg-bg p-5 transition hover:shadow-pcCard">
                  <div className="text-[18px] font-semibold text-text">{title}</div>
                  <div className="mt-3 text-[14px] leading-6 text-textSubPc">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </PcContainer>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <PageHeader title={t('charity.title')} fallbackPath="/profile" />
      <div className="px-4 pt-4 md:mx-auto md:max-w-[720px]">
        <div className="rounded-lg bg-up/10 p-5">
          <div className="text-lg font-semibold text-up">{brandName} Charity</div>
          <p className="mt-2 text-sm text-textSub">
            {t('charity.desc')}
          </p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {projects.map(([title, desc]) => (
            <div key={title} className="rounded-lg border border-line p-4">
              <div className="font-medium">{title}</div>
              <div className="mt-2 text-xs text-textSub">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
