import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ChevronDown,
  FileText,
  Globe,
  Grid3X3,
  Heart,
  Landmark,
  LogOut,
  MapPinned,
  MessageSquare,
  ReceiptText,
  Share2,
  ShieldCheck,
  TrendingUp,
  User,
  WalletCards,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '@/store/userStore';
import { useEffect, useState } from 'react';
import { useWalletModal } from '@/hooks/useWalletModal';
import LanguageFlag from '@/components/LanguageFlag';
import { setLang, SUPPORTED_LANGUAGES } from '@/i18n';
import { useSupportEntryNavigation } from '@/hooks/useSupportEntryNavigation';
import { brandLockupDarkUrl, brandName } from '@/brand';

export default function DesktopHeader() {
  const { t, i18n } = useTranslation();
  const navItems = [
    { to: '/finance', label: 'AI' },
    {
      to: '/market',
      labelKey: 'market',
      dropdown: [
        { title: t('nav.quotes'), desc: t('nav.quotesDesc'), icon: TrendingUp, path: '/market' },
        { title: t('nav.spot'), desc: t('nav.spotDesc'), icon: Grid3X3, path: '/trade' },
        { title: t('nav.contract'), desc: t('nav.contractDesc'), icon: FileText, path: '/perp' },
      ],
    },
    {
      to: '/finance',
      labelKey: 'finance',
      dropdown: [
        { title: t('nav.marketData'), desc: t('nav.marketDataDesc'), icon: BarChart3, path: '/market' },
        { title: t('nav.moreNews'), desc: t('nav.moreNewsDesc'), icon: FileText, path: '/market' },
        { title: t('nav.travel'), desc: t('nav.travelDesc'), icon: Heart, path: '/discover' },
        { title: t('nav.nft'), desc: t('nav.nftDesc'), icon: Grid3X3, path: '/nft' },
      ],
    },
    { to: '/discover', labelKey: 'discover' },
    { to: '/support', labelKey: 'tutorial' },
  ];
  const nav = useNavigate();
  const { openWalletModal } = useWalletModal();
  const user = useUserStore((s) => s.user);
  const token = useUserStore((s) => s.token);
  const refresh = useUserStore((s) => s.refresh);
  const logout = useUserStore((s) => s.logout);
  const [languageOpen, setLanguageOpen] = useState(false);
  const openSupportEntry = useSupportEntryNavigation();
  const currentLanguage =
    SUPPORTED_LANGUAGES.find((item) => item.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    if (token && !user) refresh();
  }, [token, user, refresh]);

  return (
    <header className="sticky top-0 z-40 h-[70px] w-full border-b border-line bg-bg">
      <div className="mx-auto flex h-full w-full items-center justify-between px-4 lg:px-6">
        <div className="flex h-full items-center min-w-0">
          <Link to="/" className="desktop-brand flex h-full shrink-0 items-center gap-[8px] pr-[20px] text-text">
            <img src={brandLockupDarkUrl} alt={brandName} className="desktop-brand-logo h-[34px] w-auto max-w-[220px] object-contain shrink-0" />
            <span className="inline-flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[#E5B87A] text-[14px] font-black text-white">✦</span>
            <span className="shrink-0 text-[14px] font-bold tracking-[-0.02em]">{brandName}</span>
          </Link>
          <span className="mr-[24px] h-[14px] w-[2px] shrink-0 bg-[#ededed]" />
          <nav className="flex h-full flex-1 items-center gap-[10px] text-[14px] font-normal min-w-0">
            {navItems.map((it) => (
              <div key={it.label ?? it.labelKey} className="group relative flex h-full items-center">
                <NavLink
                  to={it.to}
                  end={it.to === '/'}
                  className="flex h-[50px] min-w-[40px] items-center justify-center gap-1 px-[8px] leading-[15px] text-text transition hover:text-textSubPc"
                >
                  {it.label ?? (it.labelKey === 'tutorial' ? t('support.tutorial') : t(`nav.${it.labelKey}`))}
                  {Array.isArray(it.dropdown) && it.dropdown.length > 0 ? (
                    <ChevronDown size={14} strokeWidth={2.4} className="transition-transform duration-200 group-hover:rotate-180" />
                  ) : null}
                </NavLink>
                {Array.isArray(it.dropdown) && it.dropdown.length > 0 ? (
                  <div className="invisible absolute left-1/2 top-[54px] z-50 w-[240px] -translate-x-1/2 rounded-2xl border border-line bg-card/98 p-2 opacity-0 shadow-[0_12px_32px_rgba(0,0,0,0.12)] backdrop-blur-md transition-all duration-200 group-hover:visible group-hover:opacity-100">
                    {it.dropdown.map(({ title, desc, icon: Icon, path }) => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => nav(path)}
                        className="group/item flex min-h-[46px] w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-bgSoft"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bgSoft text-primary transition group-hover/item:bg-primary/10">
                          <Icon size={16} strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-bold leading-tight text-text">{title}</div>
                          <div className="mt-0.5 truncate text-[11px] font-medium leading-tight text-textSubPc">{desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>
        </div>

        <div className="flex h-full items-center gap-[22px] text-text">
          <div className="group relative flex h-full items-center">
            <button
              type="button"
              onClick={() => nav('/assets')}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-text hover:bg-bgSoft hover:text-primary transition"
              aria-label={t('nav.assets')}
            >
              <WalletCards size={20} strokeWidth={2} />
            </button>
            <div className="invisible absolute left-1/2 -translate-x-1/2 top-[54px] z-50 w-[200px] rounded-2xl border border-line bg-card/98 p-2 opacity-0 shadow-[0_12px_32px_rgba(0,0,0,0.12)] backdrop-blur-md transition-all duration-200 group-hover:visible group-hover:opacity-100">
              {[
                { title: t('profile.assetCenter'), path: '/assets', icon: Landmark },
                { title: t('nav.deposit'), path: '/assets/deposit', icon: WalletCards },
                { title: t('nav.withdraw'), path: '/assets/withdraw', icon: FileText },
                { title: t('nav.transfer'), path: '/assets/transfer', icon: Grid3X3 },
                { title: t('home.orderCenter'), path: '/assets/bill', icon: ReceiptText },
                { title: t('profile.addressBook'), path: '/assets/address', icon: MapPinned },
              ].map(({ title, path, icon: Icon }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => nav(path)}
                  className="flex h-9 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-[13px] font-medium text-text hover:bg-bgSoft hover:text-primary transition"
                >
                  <Icon size={16} strokeWidth={2} className="shrink-0 text-textSub" />
                  <span className="truncate">{title}</span>
                </button>
              ))}
            </div>
          </div>
          {token && user ? (
            <div className="group relative flex h-full items-center">
              <button
                type="button"
                onClick={() => nav('/profile')}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-text hover:bg-bgSoft transition"
                aria-label={t('auth.login')}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-[#00C4DF] to-[#0284C7] text-[12px] font-bold text-white shadow-sm">
                  {(user?.nickname || user?.account || 'U').slice(0, 1).toUpperCase()}
                </div>
              </button>
              <div className="invisible absolute right-[-24px] top-[54px] z-50 w-[270px] rounded-2xl border border-line bg-card/98 p-3 opacity-0 shadow-[0_12px_32px_rgba(0,0,0,0.12)] backdrop-blur-md transition-all duration-200 group-hover:visible group-hover:opacity-100">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-line/60">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#00C4DF] to-[#0284C7] text-[14px] font-bold text-white shadow-sm">
                    {(user?.nickname || user?.account || 'U').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold text-text">
                      {user?.nickname || user?.account || 'User'}
                    </div>
                    <div className="truncate text-[11px] font-medium text-textSubPc">
                      UID: {user?.uid || user?.userId || '0000'}
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 mb-2 flex items-center justify-between rounded-xl bg-bgSoft px-2.5 py-1.5 text-[11px]">
                  <span className="font-medium text-textSubPc">{t('nav.creditSecurity', '信用评分')}</span>
                  <span className="flex items-center gap-1 font-bold text-emerald-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    100
                  </span>
                </div>
                <div className="space-y-0.5">
                  {[
                    { title: t('nav.securityCenter'), path: '/profile/security', icon: ShieldCheck },
                    {
                      title: t('nav.primaryKyc'),
                      path: '/profile/kyc',
                      icon: FileText,
                      badge: user?.kycLevel ? t('nav.verified') : t('nav.unverified'),
                      badgeType: user?.kycLevel ? 'success' : 'warning',
                    },
                    { title: t('nav.shareFriends'), path: '/profile', icon: Share2 },
                  ].map(({ title, path, icon: Icon, badge, badgeType }) => (
                    <button
                      key={title}
                      type="button"
                      onClick={() => nav(path)}
                      className="flex h-9 w-full items-center justify-between rounded-xl px-2.5 text-left text-[13px] font-medium text-text hover:bg-bgSoft hover:text-primary transition"
                    >
                      <span className="flex items-center gap-2 min-w-0 pr-2">
                        <Icon size={16} strokeWidth={2} className="shrink-0 text-textSub" />
                        <span className="truncate">{title}</span>
                      </span>
                      {badge ? (
                        <span
                          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                            badgeType === 'success'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-amber-500/10 text-amber-600'
                          }`}
                        >
                          {badge}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
                <div className="my-1.5 h-px bg-line/60" />
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    nav('/auth/login');
                  }}
                  className="flex h-9 w-full items-center gap-2 rounded-xl px-2.5 text-left text-[13px] font-medium text-rose-500 hover:bg-rose-500/10 transition"
                >
                  <LogOut size={16} strokeWidth={2} className="shrink-0" />
                  <span>{t('nav.logout')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => nav('/auth/login')}
                className="h-[34px] px-3.5 rounded-lg text-[14px] font-semibold text-text hover:bg-bgSoft hover:text-primary transition"
              >
                {t('auth.login', '登录')}
              </button>
              <button
                type="button"
                onClick={() => nav('/auth/register')}
                className="h-[34px] px-4 rounded-lg bg-gradient-to-r from-[#00C4DF] to-[#0284C7] text-[14px] font-semibold text-white shadow-sm hover:opacity-95 transition"
              >
                {t('auth.register', '注册')}
              </button>
            </div>
          )}
          <button onClick={() => void openSupportEntry()} className="flex h-8 w-8 items-center justify-center" aria-label={t('home.footerSupport')}>
            <MessageSquare size={20} strokeWidth={2.3} />
          </button>
          <div className="group relative flex h-full items-center">
            <button
              type="button"
              onClick={() => setLanguageOpen((open) => !open)}
              className="flex h-8 w-8 items-center justify-center"
              title={currentLanguage.label}
              aria-label={t('common.language')}
              aria-expanded={languageOpen}
            >
              <Globe size={20} strokeWidth={2.3} />
            </button>
            <div
              className={`absolute right-0 top-[54px] z-50 w-[140px] rounded-2xl border border-line bg-card/98 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] backdrop-blur-md transition-all duration-200 ${
                languageOpen ? 'visible opacity-100' : 'invisible opacity-0 group-hover:visible group-hover:opacity-100'
              }`}
              aria-label={currentLanguage.label}
            >
              {SUPPORTED_LANGUAGES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setLang(item.code);
                    setLanguageOpen(false);
                  }}
                  className={`flex h-8 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-[13px] font-medium transition ${
                    i18n.language === item.code ? 'bg-bgSoft text-primary font-semibold' : 'text-text hover:bg-bgSoft'
                  }`}
                >
                  <LanguageFlag flag={item.flag} className="h-[14px] w-[18px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
