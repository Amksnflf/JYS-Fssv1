import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  BadgeDollarSign,
  Bell,
  Blocks,
  Bot,
  Box,
  Brush,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CircleHelp,
  ClipboardList,
  Coins,
  Copy,
  Cuboid,
  Download,
  Eraser,
  FileText,
  Globe2,
  Grid3X3,
  HandCoins,
  Headphones,
  Hexagon,
  Image,
  KeyRound,
  LogOut,
  MessageSquare,
  Monitor,
  Network,
  PanelsTopLeft,
  QrCode,
  ShieldCheck,
  Shuffle,
  UserRound,
  Wallet,
  Zap,
  X,
  type LucideIcon,
} from 'lucide-react';
import { brandLockupDarkUrl, brandName } from '@/brand';
import { useUserStore } from '@/store/userStore';
import { toast } from '@/components/Toast';
import targetUserAvatar from '@/assets/target/user-avatar.png';
import { useResponsive } from '@/hooks/useResponsive';
import { PcContainer } from '@/components/pc';
import { useSupportEntryNavigation } from '@/hooks/useSupportEntryNavigation';
import { useWalletModal } from '@/hooks/useWalletModal';
import { maskSensitiveText } from '@/utils/secureStorage';

type MenuItem = {
  key: string;
  labelKey: string;
  icon: LucideIcon;
  to?: string;
  action?: 'cache' | 'download' | 'invite';
};

const COMMON_GROUP: MenuItem[] = [
  { key: 'tutorial', labelKey: 'profile.tutorial', icon: CircleHelp, to: '/support' },
  { key: 'support_hub', labelKey: 'supportHub.title', icon: Headphones, to: '/support-hub' },
  { key: 'online_support', labelKey: 'supportHub.onlineTitle', icon: MessageSquare, to: '/support-entry' },
  { key: 'submit_ticket', labelKey: 'supportHub.ticketCreateTitle', icon: ClipboardList, to: '/support/ticket/new' },
  { key: 'my_tickets', labelKey: 'supportHub.ticketListTitle', icon: FileText, to: '/support/ticket' },
];

const ASSET_GROUP: MenuItem[] = [
  { key: 'asset_center', labelKey: 'profile.assetCenter', icon: Box, to: '/assets' },
  { key: 'spot_account', labelKey: 'asset.spotAcc', icon: CircleDollarSign, to: '/assets/account/1' },
  { key: 'trade_account', labelKey: 'asset.tradeAcc', icon: Grid3X3, to: '/assets/account/2' },
  { key: 'finance_account', labelKey: 'asset.financeAcc', icon: Coins, to: '/assets/account/3' },
  { key: 'deposit', labelKey: 'profile.deposit', icon: ArrowDownToLine, to: '/assets/deposit' },
  { key: 'withdraw', labelKey: 'profile.withdraw', icon: ArrowUpFromLine, to: '/assets/withdraw' },
  { key: 'transfer', labelKey: 'asset.transfer', icon: ArrowLeftRight, to: '/assets/transfer' },
  { key: 'flash', labelKey: 'asset.flash', icon: Zap, to: '/assets/flash' },
  { key: 'bill', labelKey: 'asset.bill', icon: ClipboardList, to: '/assets/bill' },
  { key: 'address', labelKey: 'profile.addressBook', icon: BadgeDollarSign, to: '/assets/address' },
  { key: 'collections', labelKey: 'asset.myCollections', icon: Image, to: '/assets/nft/manage' },
];

const TRADE_GROUP: MenuItem[] = [
  { key: 'market', labelKey: 'nav.market', icon: Monitor, to: '/market' },
  { key: 'option', labelKey: 'profile.option', icon: PanelsTopLeft, to: '/option' },
  { key: 'spot', labelKey: 'profile.spot', icon: Network, to: '/trade' },
  { key: 'contract', labelKey: 'profile.contract', icon: Cuboid, to: '/perp' },
  { key: 'follow', labelKey: 'discover.follow', icon: UserRound, to: '/follow' },
  { key: 'nft', labelKey: 'NFT', icon: Shuffle, to: '/nft' },
  { key: 'ai', labelKey: 'profile.aiTrade', icon: Bot, to: '/finance' },
];

const EARN_GROUP: MenuItem[] = [
  { key: 'loan', labelKey: 'profile.loan', icon: HandCoins, to: '/finance/loan/1' },
  { key: 'portfolio', labelKey: 'profile.portfolio', icon: Blocks, to: '/finance/portfolio' },
  { key: 'lock', labelKey: 'profile.lockEarn', icon: KeyRound, to: '/finance/lock' },
  { key: 'order_center', labelKey: 'home.orderCenter', icon: FileText, to: '/finance/orders' },
];

const PLATFORM_GROUP: MenuItem[] = [
  { key: 'notice', labelKey: 'profile.notice', icon: Bell, to: '/announcement' },
  { key: 'dynamic', labelKey: 'market.tabDynamic', icon: Brush, to: '/market?tab=tabDynamic' },
  { key: 'charity', labelKey: 'profile.charity', icon: Hexagon, to: '/charity' },
  { key: 'security', labelKey: 'profile.security', icon: ShieldCheck, to: '/profile/security' },
  { key: 'lang', labelKey: 'profile.language', icon: Globe2, to: '/profile/language' },
  // { key: 'download', labelKey: 'profile.downloadApp', icon: Download, action: 'download' },
];

export default function ProfilePage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { isPc } = useResponsive();
  const user = useUserStore((s) => s.user);
  const token = useUserStore((s) => s.token);
  const refresh = useUserStore((s) => s.refresh);
  const logout = useUserStore((s) => s.logout);
  const [inviteOpen, setInviteOpen] = useState(false);
  const openSupportEntry = useSupportEntryNavigation();
  const { openWalletModal } = useWalletModal();

  useEffect(() => {
    if (!token) {
      nav('/auth/login?redirect=%2Fprofile', { replace: true });
      return;
    }
    if (!user && token) refresh();
  }, [nav, refresh, token, user]);

  if (!user) return null;

  const displayName = user.nickname || maskSensitiveText(user.account) || user.uid;

  const onLogout = async () => {
    await logout();
    nav('/auth/login');
  };

  const goPrimaryKyc = () => {
    nav('/profile/kyc?level=1');
  };

  if (isPc) {
    return (
      <div className="bg-bg py-10 text-text">
        <PcContainer>
          <section className="rounded-lg border border-line bg-bg p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <img
                  src={user.avatar || targetUserAvatar}
                  alt="user avatar"
                  className="h-[74px] w-[74px] shrink-0 rounded-full border-2 border-white shadow-md shadow-cyan-500/20 object-cover"
                />
                <div>
                  <div className="text-[24px] font-semibold text-text">{displayName}</div>
                  <div className="mt-2 flex items-center gap-3 text-[14px] text-textSubPc">
                    UID:{user.uid}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(user.uid);
                        toast.success(t('common.copied'));
                      }}
                      className="h-2 w-2 bg-textSubPc"
                      aria-label="copy uid"
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[13px]">
                    <button
                      type="button"
                      onClick={goPrimaryKyc}
                      className="rounded bg-bgSection px-2 py-1 text-textSubPc"
                    >
                      {user.kycLevel > 0 ? t('profile.verified') : t('profile.unverified')}
                    </button>
                    <span className="rounded bg-bgSection px-2 py-1 text-textSubPc">
                      {user.vipLevel > 0 ? `VIP${user.vipLevel}` : t('profile.normalUser')}
                    </span>
                    <button onClick={() => setInviteOpen(true)} className="text-text" aria-label="invite qr">
                      <QrCode size={18} />
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={() => nav('/profile/credit-score')} className="flex items-center gap-4 rounded-lg bg-bgSection px-5 py-4">
                <CreditGauge />
                <ChevronRight size={22} />
              </button>
            </div>
          </section>

          <div className="mt-8 grid grid-cols-2 gap-5">
            <PcMenuGroup title={t('profile.commonFeatures')} items={COMMON_GROUP} />
            <PcMenuGroup title={t('profile.assetManagement')} items={ASSET_GROUP} />
            <PcMenuGroup title={t('profile.trade')} items={TRADE_GROUP} />
            <PcMenuGroup title={t('profile.earnRewards')} items={EARN_GROUP} />
            <div className="col-span-2">
              <PcMenuGroup title={t('profile.platformFeatures')} items={PLATFORM_GROUP} wide />
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-line bg-bg p-5">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => toast.success(t('profile.cacheCleared'))} className="pc-btn-ghost pc-btn-lg w-full">
                <Eraser size={18} className="mr-2" /> {t('profile.clearCache')}
              </button>
              <button onClick={onLogout} className="pc-btn-dark pc-btn-lg w-full">
                <LogOut size={18} className="mr-2" /> {t('profile.logout')}
              </button>
            </div>
          </div>

          {inviteOpen && <InviteModal inviteCode={user.inviteCode || user.uid} onClose={() => setInviteOpen(false)} />}
        </PcContainer>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-bg px-3.5 pb-14 pt-0 text-text">
      <header className="sticky top-0 z-30 -mx-3.5 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-3.5 backdrop-blur">
        <button onClick={() => nav(-1)} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200/70 text-slate-700 shadow-sm transition active:scale-95" aria-label="back">
          <ChevronLeft size={20} />
        </button>
        <div className="text-sm font-bold text-slate-800">{t('profile.title', '个人中心')}</div>
        <div className="flex items-center gap-2">
          <button onClick={() => void openSupportEntry()} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200/70 text-slate-700 shadow-sm transition active:scale-95" aria-label="support">
            <Headphones size={17} />
          </button>
          <button onClick={() => void openSupportEntry()} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200/70 text-slate-700 shadow-sm transition active:scale-95" aria-label="message">
            <MessageSquare size={17} />
          </button>
        </div>
      </header>

      {/* User Info Hero Card */}
      <section className="mt-4 rounded-3xl bg-white p-4 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={user.avatar || targetUserAvatar}
              alt="user avatar"
              className="h-14 w-14 shrink-0 rounded-full border-2 border-white shadow-md shadow-cyan-500/20 object-cover"
            />
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-500/20" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold text-slate-900 leading-tight">
              {displayName}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 font-mono">
              <span>UID: {user.uid}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(user.uid);
                  toast.success(t('common.copied'));
                }}
                className="text-slate-400 hover:text-cyan-600 transition"
                aria-label="copy uid"
              >
                <Copy size={12} />
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={goPrimaryKyc}
                className="rounded-full bg-cyan-50 border border-cyan-200/60 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 leading-none"
              >
                {user.kycLevel > 0 ? t('profile.verified') : t('profile.unverified')}
              </button>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 leading-none">
                {user.vipLevel > 0 ? `VIP${user.vipLevel}` : t('profile.normalUser')}
              </span>
              <button
                onClick={() => setInviteOpen(true)}
                className="ml-auto flex items-center gap-1 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-700 transition"
                aria-label="invite qr"
              >
                <QrCode size={13} />
                <span>{t('profile.invite', '邀请')}</span>
              </button>
            </div>
          </div>
          <button onClick={() => nav('/profile/credit-score')} className="flex items-center gap-1 pl-2 border-l border-slate-100">
            <CreditGauge />
            <ChevronRight size={16} className="text-slate-400" />
          </button>
        </div>
      </section>

      <MenuGroup title={t('profile.commonFeatures')} items={COMMON_GROUP} />
      <MenuGroup title={t('profile.assetManagement')} items={ASSET_GROUP} />
      <MenuGroup title={t('profile.trade')} items={TRADE_GROUP} />
      <MenuGroup title={t('profile.earnRewards')} items={EARN_GROUP} />
      <MenuGroup title={t('profile.platformFeatures')} items={PLATFORM_GROUP} />

      {/* Settings / Actions */}
      <div className="mt-4 rounded-3xl bg-white p-2 border border-slate-100 shadow-sm space-y-0.5">
        <button
          onClick={() => toast.success(t('profile.cacheCleared'))}
          className="flex w-full items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Eraser size={15} />
            </span>
            <span>{t('profile.clearCache')}</span>
          </div>
          <ChevronRight size={15} className="text-slate-400" />
        </button>
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold text-rose-500 hover:bg-rose-50 transition"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
              <LogOut size={15} />
            </span>
            <span>{t('profile.logout')}</span>
          </div>
          <ChevronRight size={15} className="text-rose-400" />
        </button>
      </div>

      {inviteOpen && <InviteModal inviteCode={user.inviteCode || user.uid} onClose={() => setInviteOpen(false)} />}
    </div>
  );
}

function PcMenuGroup({ title, items, wide = false }: { title: string; items: MenuItem[]; wide?: boolean }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const openSupportEntry = useSupportEntryNavigation();
  const handleClick = (item: MenuItem) => {
    if (item.to === '/support-entry') {
      void openSupportEntry();
      return;
    }
    if (item.to) {
      nav(item.to);
      return;
    }
    if (item.action === 'download') toast.info(t('profile.downloadNotConfigured'));
    else toast.info(t('profile.comingSoon'));
  };

  return (
    <section className="rounded-lg border border-line bg-bg p-6">
      <h2 className="pc-card-title">{title}</h2>
      <div className={`mt-5 grid ${wide ? 'grid-cols-7' : 'grid-cols-4'} gap-4`}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => handleClick(item)}
              className="flex flex-col items-center gap-3 rounded-lg bg-bgSection px-3 py-5 text-center transition hover:shadow-pcCard"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-bg text-text">
                <Icon size={22} strokeWidth={2.1} className="fill-none" />
              </span>
              <span className="text-[14px] text-text">{item.labelKey === 'NFT' ? 'NFT' : t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MenuGroup({ title, items }: { title: string; items: MenuItem[] }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const openSupportEntry = useSupportEntryNavigation();
  const handleClick = (item: MenuItem) => {
    if (item.to === '/support-entry') {
      void openSupportEntry();
      return;
    }
    if (item.to) {
      nav(item.to);
      return;
    }
    if (item.action === 'download') toast.info(t('profile.downloadNotConfigured'));
    else toast.info(t('profile.comingSoon'));
  };

  return (
    <section className="mt-3.5 rounded-3xl bg-white p-4 border border-slate-100 shadow-sm">
      <h2 className="text-xs font-bold text-slate-800 tracking-tight">{title}</h2>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => handleClick(item)}
              className="group flex flex-col items-center gap-1.5 py-1 text-center transition active:scale-95"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500/10 to-sky-500/15 text-cyan-600 border border-cyan-100/70 group-hover:scale-105 group-hover:border-cyan-200 transition shadow-none">
                <Icon size={20} strokeWidth={2} className="fill-none" />
              </span>
              <span className="text-[11px] font-medium text-slate-700 group-hover:text-cyan-600 transition truncate w-full">
                {item.labelKey === 'NFT' ? 'NFT' : t(item.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ActionRow({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-6 py-4 text-left text-[16px]">
      <span className="w-7">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function CreditGauge() {
  return (
    <div className="relative h-9 w-12">
      <div className="absolute inset-x-0 top-0 mx-auto h-7 w-11 rounded-t-full border-[5px] border-b-0 border-cyan-400" />
      <div className="absolute left-1.5 top-3 h-1.5 w-3 rotate-[25deg] bg-cyan-600 rounded-full" />
      <div className="absolute bottom-0 w-full text-center text-[10px] font-bold leading-none text-cyan-600">100</div>
    </div>
  );
}

function InviteModal({ inviteCode, onClose }: { inviteCode: string; onClose: () => void }) {
  const { t } = useTranslation();
  useEffect(() => {
    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyTouchAction = body.style.touchAction;
    const prevHtmlOverflow = documentElement.style.overflow;
    const prevHtmlTouchAction = documentElement.style.touchAction;

    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    documentElement.style.overflow = 'hidden';
    documentElement.style.touchAction = 'none';

    return () => {
      body.style.overflow = prevBodyOverflow;
      body.style.touchAction = prevBodyTouchAction;
      documentElement.style.overflow = prevHtmlOverflow;
      documentElement.style.touchAction = prevHtmlTouchAction;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/65 px-4 py-4">
      <section className="aster-modal-pop w-full max-w-[370px] max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl bg-bg p-6 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
        <div className="flex items-center justify-between">
          <img src={brandLockupDarkUrl} alt={brandName} className="h-8 w-auto max-w-[210px] object-contain" />
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-text text-bg">
            <X size={24} />
          </button>
        </div>
        <div className="mt-9 text-3xl font-bold">{t('profile.inviteTitle')}</div>
        <div className="mt-3 text-xl">{t('profile.inviteSub')}</div>

        <div className="mt-8 flex h-[190px] items-center justify-center rounded-lg bg-bgSoft">
          <img
            src="/assets/share00.png"
            alt="share illustration"
            className="max-h-[160px] w-auto object-contain"
          />
        </div>

        <div className="mt-8 border-t border-line pt-5">
          <div className="grid grid-cols-2 items-center gap-5">
            <div>
              <div className="text-base text-textSub">{t('profile.myInviteCode')}</div>
              <div className="num mt-3 text-2xl font-bold text-[#2F7D32]">{inviteCode}</div>
              <div className="mt-8 text-sm text-textSub">{t('profile.inviteTip')}</div>
            </div>
            <div className="flex h-[112px] w-[112px] items-center justify-center border border-line bg-bgSoft text-center text-xs text-textSub">
              {t('common.noData')}
            </div>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}
