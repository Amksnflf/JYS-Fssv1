import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, FileText, Headset, LifeBuoy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/PageHeader';
import { PcContainer } from '@/components/pc';
import { useResponsive } from '@/hooks/useResponsive';
import { useUserStore } from '@/store/userStore';
import {
  fetchSupportCategories,
  localizeSupportCategories,
  type SupportCategory,
  type SupportHubConfig,
} from '@/api/support';
import { tutorials } from '@/data/tutorials';
import { loadSupportConfig } from '@/utils/supportEntry';

type HubCard = {
  key: string;
  title: string;
  desc: string;
  icon: typeof BookOpen;
  onClick: () => void;
  hidden?: boolean;
};

function categoryPreview(categories: SupportCategory[]) {
  return categories.slice(0, 4).map((item) => item.categoryName);
}

export default function SupportHubPage() {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const { isPc } = useResponsive();
  const token = useUserStore((s) => s.token);
  const [config, setConfig] = useState<SupportHubConfig | null>(null);
  const [categories, setCategories] = useState<SupportCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([loadSupportConfig(true), fetchSupportCategories()])
      .then(([configRes, categoryRes]) => {
        if (cancelled) return;
        if (configRes.status === 'fulfilled') setConfig(configRes.value);
        if (categoryRes.status === 'fulfilled') setCategories(categoryRes.value ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const preview = useMemo(
    () => categoryPreview(localizeSupportCategories(categories, i18n.language)),
    [categories, i18n.language]
  );

  const openTicketCreate = () => {
    if (!token) {
      nav('/auth/login?redirect=%2Fsupport%2Fticket%2Fnew');
      return;
    }
    nav('/support/ticket/new');
  };

  const openTicketList = () => {
    if (!token) {
      nav('/auth/login?redirect=%2Fsupport%2Fticket');
      return;
    }
    nav('/support/ticket');
  };

  const openThirdPartySupport = () => {
    nav('/support/live');
  };

  const cards: HubCard[] = [
    {
      key: 'help',
      title: t('supportHub.helpCenterTitle'),
      desc: t('supportHub.helpCenterDesc'),
      icon: BookOpen,
      onClick: () => nav('/support'),
      hidden: config ? !config.helpCenterEnabled : false,
    },
    {
      key: 'chat',
      title: t('supportHub.onlineTitle'),
      desc: t('supportHub.onlineDesc'),
      icon: Headset,
      onClick: openThirdPartySupport,
      hidden: config ? config.mode === 'help_only' : false,
    },
    {
      key: 'new',
      title: t('supportHub.ticketCreateTitle'),
      desc: t('supportHub.ticketCreateDesc'),
      icon: FileText,
      onClick: openTicketCreate,
      hidden: config ? !config.ticketEnabled : false,
    },
    {
      key: 'my',
      title: t('supportHub.ticketListTitle'),
      desc: t('supportHub.ticketListDesc'),
      icon: LifeBuoy,
      onClick: openTicketList,
      hidden: config ? !config.ticketEnabled : false,
    },
  ].filter((item) => !item.hidden);

  if (isPc) {
    return (
      <div className="bg-bg py-10 text-text">
        <PcContainer>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="pc-h2 m-0">{t('supportHub.title')}</h1>
              <p className="mt-3 text-[14px] text-textSubPc">{t('supportHub.subtitle')}</p>
            </div>
            <Link to="/support" className="pc-btn-ghost">
              {t('support.tutorial')}
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-6">
            {cards.map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={card.onClick}
                className="rounded-2xl border border-line bg-bg p-6 text-left shadow-card transition hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bgSoft text-text">
                    <card.icon size={22} />
                  </div>
                  <ChevronRight size={18} className="text-textSubPc" />
                </div>
                <div className="mt-5 text-[18px] font-semibold text-text">{card.title}</div>
                <div className="mt-2 text-[14px] leading-6 text-textSubPc">{card.desc}</div>
              </button>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-[1.3fr_1fr] gap-6">
            <section className="rounded-2xl border border-line bg-bg p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-semibold">{t('supportHub.popularTutorials')}</h2>
                <Link to="/support" className="text-[13px] text-textSubPc">
                  {t('common.viewMore')}
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {tutorials.slice(0, 5).map((item) => (
                  <Link
                    key={item.id}
                    to={`/support/${item.id}`}
                    className="flex items-center justify-between rounded-xl bg-bgSection px-4 py-4 text-[14px] text-text transition hover:bg-bgSoft"
                  >
                    <span className="line-clamp-1 pr-4">{t(`tutorials.${item.id}.title`)}</span>
                    <ChevronRight size={16} className="shrink-0 text-textSubPc" />
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-bg p-6">
              <h2 className="text-[18px] font-semibold">{t('supportHub.categoryPreview')}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {preview.length ? (
                  preview.map((item) => (
                    <span key={item} className="rounded-full bg-bgSoft px-3 py-2 text-[13px] text-textSubPc">
                      {item}
                    </span>
                  ))
                ) : (
                  <div className="text-[14px] text-textSubPc">{loading ? t('common.loading') : t('common.noData')}</div>
                )}
              </div>
              <div className="mt-6 rounded-xl bg-[#F4F8F2] px-4 py-4 text-[13px] leading-6 text-[#406235]">
                {token ? t('supportHub.loggedInTip') : t('supportHub.loginTip')}
              </div>
            </section>
          </div>
        </PcContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-12 md:bg-[#3c3c3c] md:py-6">
      <div className="mx-auto min-h-screen w-full max-w-md bg-bg">
        <PageHeader title={t('supportHub.title')} fallbackPath="/" />
        <div className="px-4 pb-8 pt-5">
          <div className="grid grid-cols-2 gap-3">
            {cards.map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={card.onClick}
                className="rounded-2xl border border-line bg-bg px-4 py-4 text-left shadow-card"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-bgSoft text-text">
                  <card.icon size={20} />
                </div>
                <div className="mt-4 text-[15px] font-semibold text-text">{card.title}</div>
                <div className="mt-2 text-[12px] leading-5 text-textSub">{card.desc}</div>
              </button>
            ))}
          </div>

          <section className="mt-6 rounded-2xl border border-line bg-bg px-4 py-4 shadow-card">
            <div className="flex items-center justify-between">
              <div className="text-[16px] font-semibold">{t('supportHub.popularTutorials')}</div>
              <Link to="/support" className="text-[12px] text-textSub">
                {t('common.viewMore')}
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {tutorials.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  to={`/support/${item.id}`}
                  className="flex items-center justify-between rounded-xl bg-bgSoft px-3 py-3 text-[13px]"
                >
                  <span className="line-clamp-1 pr-3">{t(`tutorials.${item.id}.title`)}</span>
                  <ChevronRight size={16} className="shrink-0 text-textSub" />
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-line bg-bg px-4 py-4 shadow-card">
            <div className="text-[16px] font-semibold">{t('supportHub.categoryPreview')}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {preview.length ? (
                preview.map((item) => (
                  <span key={item} className="rounded-full bg-bgSoft px-3 py-2 text-[12px] text-textSub">
                    {item}
                  </span>
                ))
              ) : (
                <div className="text-[13px] text-textSub">{loading ? t('common.loading') : t('common.noData')}</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
