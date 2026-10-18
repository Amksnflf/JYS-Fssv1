import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageFlag from '@/components/LanguageFlag';
import { setLang, SUPPORTED_LANGUAGES } from '@/i18n';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useSupportEntryNavigation } from '@/hooks/useSupportEntryNavigation';
import { brandLockupLightUrl, brandName } from '@/brand';

const footerGroups = [
  {
    titleKey: 'home.footerMarket',
    links: [
      { labelKey: 'trade.spot', to: '/market' },
      { labelKey: 'nav.perp', to: '/perp' },
      { labelKey: 'nav.option', to: '/option' },
    ],
  },
  {
    titleKey: 'home.footerAssets',
    links: [
      { labelKey: 'home.myAssets', to: '/assets' },
      { labelKey: 'asset.deposit', to: '/assets/deposit' },
      { labelKey: 'asset.withdraw', to: '/assets/withdraw' },
      { labelKey: 'asset.transfer', to: '/assets/transfer' },
      { labelKey: 'home.orderCenter', to: '/finance/orders' },
    ],
  },
  {
    titleKey: 'home.footerFinance',
    links: [{ labelKey: 'home.products', to: '/finance' }],
  },
  {
    titleKey: 'home.footerSupport',
    links: [
      { labelKey: 'support.tutorial', to: '/support' },
      { labelKey: 'home.consulting', to: '/support-entry' },
    ],
  },
  {
    titleKey: 'home.footerPolicy',
    links: [
      { labelKey: 'home.terms', to: '/support' },
      { labelKey: 'home.privacy', to: '/support' },
      { labelKey: 'home.aml', to: '/support' },
    ],
  },
];

export default function DesktopFooter() {
  const { t, i18n } = useTranslation();
  const [languageOpen, setLanguageOpen] = useState(false);
  const openSupportEntry = useSupportEntryNavigation();
  const currentLanguage =
    SUPPORTED_LANGUAGES.find((item) => item.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  return (
    <footer className="relative left-1/2 w-screen min-w-[1024px] -translate-x-1/2 bg-black text-white">
      <div className="mx-auto w-[1300px] max-w-full px-[24px] pb-[40px] pt-[54px]">
        <div className="flex items-start justify-between gap-[96px]">
          <div className="w-[300px] shrink-0">
            <Link to="/" className="desktop-footer-brand inline-flex items-center gap-[10px] text-white">
              <img src={brandLockupLightUrl} alt={brandName} className="desktop-footer-brand-logo h-[34px] w-auto max-w-[220px] object-contain" />
              <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#E5B87A] text-[15px] font-black text-white">✦</span>
              <span className="text-[16px] font-semibold leading-none tracking-[-0.02em]">{brandName}</span>
            </Link>

            <p className="mt-[22px] max-w-[260px] text-[12px] font-normal leading-[22px] text-white/44">
              {t('home.copyright')} {t('home.footerCompanyDesc')}
            </p>
            <p className="mt-[4px] text-[12px] font-normal leading-[22px] text-white/44">{t('home.businessContact')}</p>

            <div className="relative mt-[28px] w-[168px]">
              <button
                type="button"
                onClick={() => setLanguageOpen((open) => !open)}
                className="flex h-[30px] w-[168px] items-center justify-between px-0 text-[13px] font-normal leading-none text-white/76 transition hover:text-white"
                aria-expanded={languageOpen}
                aria-label={t('common.language')}
              >
                <span className="flex min-w-0 items-center gap-[8px]">
                  <LanguageFlag flag={currentLanguage.flag} className="h-[14px] w-[18px]" />
                  <span className="truncate">{currentLanguage.label}</span>
                </span>
                <ChevronDown size={14} className={`transition ${languageOpen ? 'rotate-180' : ''}`} />
              </button>
              <div
                className={`absolute bottom-[36px] left-[-12px] z-10 w-[188px] overflow-hidden rounded-[8px] bg-black py-[8px] text-white shadow-pop transition ${
                  languageOpen ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-1 opacity-0'
                }`}
              >
                {SUPPORTED_LANGUAGES.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      setLang(item.code);
                      setLanguageOpen(false);
                    }}
                    className="flex h-[36px] w-full items-center gap-[9px] px-[12px] text-left text-[13px] font-normal text-white/66 transition hover:text-white"
                  >
                    <LanguageFlag flag={item.flag} className="h-[14px] w-[18px]" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-5 gap-x-[56px] pt-[2px]">
            {footerGroups.map((group) => (
              <div key={group.titleKey}>
                <h3 className="mb-[18px] whitespace-nowrap text-[13px] font-semibold leading-none tracking-[0.03em] text-white/92">
                  {t(group.titleKey)}
                </h3>
                <div className="space-y-[11px]">
                  {group.links.map((link) => (
                    link.to === '/support-entry' ? (
                      <button
                        key={link.labelKey}
                        type="button"
                        onClick={() => void openSupportEntry()}
                        className="block whitespace-nowrap text-[13px] font-normal leading-[20px] text-white/48 transition hover:text-white/88"
                      >
                        {t(link.labelKey)}
                      </button>
                    ) : (
                      <Link
                        key={link.labelKey}
                        to={link.to}
                        className="block whitespace-nowrap text-[13px] font-normal leading-[20px] text-white/48 transition hover:text-white/88"
                      >
                        {t(link.labelKey)}
                      </Link>
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-[44px] max-w-[900px] text-[12px] font-normal leading-[22px] text-white/38">{t('home.footerRisk')}</p>
      </div>
    </footer>
  );
}
