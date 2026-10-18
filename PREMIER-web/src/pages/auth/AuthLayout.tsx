import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Headphones } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '@/hooks/useResponsive';
import { useSupportEntryNavigation } from '@/hooks/useSupportEntryNavigation';
import { brandLockupDarkUrl, brandName } from '@/brand';

interface Props {
  title: string;
  children: ReactNode;
}

export default function AuthLayout({ title, children }: Props) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const location = useLocation();
  const { isPc } = useResponsive();
  const openSupportEntry = useSupportEntryNavigation();
  const redirect = new URLSearchParams(location.search).get('redirect');
  const onBack = () => {
    if (redirect) {
      nav('/', { replace: true });
      return;
    }
    nav(-1);
  };

  if (isPc) {
    return (
      <div className="relative flex min-h-screen w-full flex-col justify-between overflow-x-hidden bg-[#F8FAFC] text-text">
        {/* Professional ambient lighting & grid pattern */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-[160px] left-1/2 -translate-x-1/2 h-[520px] w-[900px] rounded-full bg-gradient-to-b from-[#00C4DF]/15 via-[#0284C7]/8 to-transparent blur-3xl" />
          <div className="absolute -bottom-[160px] right-[-80px] h-[500px] w-[500px] rounded-full bg-gradient-to-t from-[#0284C7]/10 to-transparent blur-3xl" />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: 'radial-gradient(rgba(100, 116, 139, 0.28) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        {/* Minimalist Top Bar */}
        <header className="relative z-10 flex h-16 w-full items-center justify-between px-8">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-textSubPc shadow-xs backdrop-blur hover:bg-white hover:text-text hover:shadow-sm transition active:scale-95"
          >
            <ArrowLeft size={14} />
            <span>{t('common.backToHome', '返回首页')}</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void openSupportEntry()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-textSubPc shadow-xs backdrop-blur hover:bg-white hover:text-text hover:shadow-sm transition active:scale-95"
            >
              <Headphones size={14} />
              <span>{t('support.liveChat', '在线客服')}</span>
            </button>
          </div>
        </header>

        {/* Centered Auth Card */}
        <main className="relative z-10 my-auto flex w-full justify-center px-4 py-8">
          <div className="aster-modal-pop w-[480px] max-w-full rounded-2xl border border-slate-200/80 bg-white/95 p-8 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.04)] backdrop-blur-xl sm:p-10">
            <div className="relative flex items-center justify-between">
              <button
                onClick={onBack}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-textSubPc hover:bg-bgSoft hover:text-text transition"
                aria-label="back"
              >
                <ArrowLeft size={18} />
              </button>
              <img
                src={brandLockupDarkUrl}
                alt={brandName}
                className="pointer-events-none absolute left-1/2 h-9 max-w-[220px] w-auto -translate-x-1/2 object-contain"
              />
              <button
                className="flex h-9 w-9 items-center justify-center rounded-xl text-textSubPc hover:bg-bgSoft hover:text-text transition"
                aria-label="support"
                onClick={() => void openSupportEntry()}
              >
                <Headphones size={18} />
              </button>
            </div>
            {title && <h1 className="mt-7 text-[22px] font-bold text-text tracking-tight">{title}</h1>}
            <div className={title ? 'mt-6' : 'mt-5'}>{children}</div>
          </div>
        </main>

        {/* Minimalist Trust Footer */}
        <footer className="relative z-10 py-5 text-center text-[12px] font-medium text-textSubPc">
          <span>© 2026 {brandName}. All rights reserved. · Bank-Grade SSL Encryption · 7x24h Security Guard</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="page-motion mx-auto max-w-md px-5 pb-8 pt-0">
        <div className="sticky top-0 z-30 -mx-5 flex items-center justify-between border-b border-line bg-bg/95 px-5 py-4 backdrop-blur">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-bgSoft text-text hover:bg-bg"
            aria-label="back"
          >
            <ArrowLeft size={18} />
          </button>
          <img
            src={brandLockupDarkUrl}
            alt={brandName}
            className="pointer-events-none absolute left-1/2 h-9 max-w-[224px] w-auto -translate-x-1/2 object-contain"
          />
          <button className="flex h-9 w-9 items-center justify-center rounded-lg text-textSub hover:bg-bgSoft hover:text-text" aria-label="support" onClick={() => void openSupportEntry()}>
            <Headphones size={20} />
          </button>
        </div>
        {title && <h1 className="mt-9 text-[28px] font-black leading-tight tracking-[-0.03em]">{title}</h1>}
        <div className={title ? 'mt-8' : 'mt-7'}>{children}</div>
      </div>
    </div>
  );
}
