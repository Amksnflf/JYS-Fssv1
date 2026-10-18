import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import SubLayout from './layouts/SubLayout';
import { useUserStore } from './store/userStore';
import HomePage from './pages/Home';
import MarketPage from './pages/Market';
import TradePage from './pages/Trade';
import PerpPage from './pages/Perp';
import OptionPage from './pages/Option';
import FinancePage from './pages/Finance';
import NftPage from './pages/Nft';
import NftCollectionDetailPage from './pages/NftCollectionDetail';
import NftItemDetailPage from './pages/NftItemDetail';
import AnnouncementListPage from './pages/AnnouncementList';
import AnnouncementDetailPage from './pages/AnnouncementDetail';
import NewsDetailPage from './pages/NewsDetail';
import SupportPage from './pages/Support';
import SupportDetailPage from './pages/SupportDetail';
import LegalDocumentPage from './pages/LegalDocument';
import SupportHubPage from './pages/SupportHub';
import SupportEntryPage from './pages/SupportEntry';
import SupportLivePage from './pages/SupportLive';
import SupportTicketCreatePage from './pages/SupportTicketCreate';
import SupportTicketListPage from './pages/SupportTicketList';
import SupportTicketDetailPage from './pages/SupportTicketDetail';
import CharityPage from './pages/Charity';
import FollowPage from './pages/Follow';
import LockListPage from './pages/finance/LockList';
import LockDetailPage from './pages/finance/LockDetail';
import LockOrdersPage from './pages/finance/LockOrders';
import PortfolioListPage from './pages/finance/PortfolioList';
import PortfolioProductDetailPage from './pages/finance/PortfolioProductDetail';
import PortfolioOrdersPage from './pages/finance/PortfolioOrders';
import LoanDetailPage from './pages/finance/LoanDetail';
import MyFinanceOrdersPage from './pages/finance/MyOrders';
import AiDetailPage from './pages/finance/AiDetail';
import AiRulesPage from './pages/finance/AiRules';
import AiOrdersPage from './pages/finance/AiOrders';
import DiscoverPage from './pages/Discover';
import AssetsPage from './pages/Assets';
import { loadSupportConfig } from './utils/supportEntry';
import LoginPage from './pages/auth/Login';
import RegisterPage from './pages/auth/Register';
import ForgotPasswordPage from './pages/auth/ForgotPassword';
import WalletLoginPage from './pages/auth/WalletLogin';
import ProfilePage from './pages/profile/Profile';
import SecurityPage from './pages/profile/Security';
import KycPage from './pages/profile/Kyc';
import CreditScorePage from './pages/profile/CreditScore';
import LanguagePage from './pages/profile/Language';
import DepositPage from './pages/asset/Deposit';
import WithdrawPage from './pages/asset/Withdraw';
import TransferPage from './pages/asset/Transfer';
import BillPage from './pages/asset/Bill';
import AddressBookPage from './pages/asset/AddressBook';
import FlashPage from './pages/asset/Flash';
import AccountDetailPage from './pages/asset/AccountDetail';
import NftManagePage from './pages/asset/NftManage';
import KlinePage from './pages/trade/KlinePage';
import WalletLoginModal from './components/WalletLoginModal';
import { setUnauthorizedHandler } from './api/http';
import { useWalletModal } from './hooks/useWalletModal';

const PAGE_TRANSITION_MS = 160;

function isAssetPath(pathname: string) {
  return pathname === '/assets' || pathname.startsWith('/assets/');
}

function RequireAuth({ children }: { children: ReactNode }) {
  const token = useUserStore((s) => s.token);
  const location = useLocation();
  const isBypass = typeof window !== 'undefined' && Boolean(localStorage.getItem('bypass_auth'));

  if (!token && !isBypass) {
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return children;
}

export default function App() {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionState, setTransitionState] = useState<'enter' | 'exit'>('enter');
  const timerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void useUserStore.getState().logout();
      const path = window.location.pathname;
      const isProtected = ['/assets', '/profile'].some((p) => path === p || path.startsWith(p + '/'));
      if (isProtected) {
        window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      }
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('scrollRestoration' in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    void loadSupportConfig().catch(() => {});
  }, []);

  useEffect(() => {
    if (location.key === displayLocation.key) return;

    if (isAssetPath(location.pathname) || isAssetPath(displayLocation.pathname)) {
      window.clearTimeout(timerRef.current);
      setDisplayLocation(location);
      setTransitionState('enter');
      return;
    }

    setTransitionState('exit');
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setDisplayLocation(location);
      setTransitionState('enter');
    }, PAGE_TRANSITION_MS);

    return () => window.clearTimeout(timerRef.current);
  }, [displayLocation.key, location]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const scrollRoot = document.scrollingElement ?? document.documentElement;
    scrollRoot.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [displayLocation.key]);

  return (
    <div className={`route-transition route-transition-${transitionState}`}>
      <Routes location={displayLocation}>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/forgot" element={<ForgotPasswordPage />} />
        <Route path="/auth/wallet" element={<WalletLoginPage />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/market" element={<MarketPage />} />
          <Route path="/trade" element={<TradePage />} />
          <Route path="/perp" element={<PerpPage />} />
          <Route path="/option" element={<OptionPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/charity" element={<CharityPage />} />
          <Route path="/follow" element={<FollowPage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/finance/portfolio" element={<PortfolioListPage />} />
          <Route path="/news/:id" element={<NewsDetailPage />} />
          <Route path="/assets" element={<RequireAuth><AssetsPage /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/profile/security" element={<RequireAuth><SecurityPage /></RequireAuth>} />
          <Route path="/profile/kyc" element={<RequireAuth><KycPage /></RequireAuth>} />
          <Route path="/profile/credit-score" element={<RequireAuth><CreditScorePage /></RequireAuth>} />
        </Route>

        {/* 资产相关二级页（无底部 Tab） — 套用 SubLayout 让 PC 端拿到顶栏/底栏 */}
        <Route element={<SubLayout />}>
          <Route path="/announcement" element={<AnnouncementListPage />} />
          <Route path="/announcement/:id" element={<AnnouncementDetailPage />} />
          <Route path="/profile/language" element={<LanguagePage />} />
          <Route path="/assets/deposit" element={<RequireAuth><DepositPage /></RequireAuth>} />
          <Route path="/assets/withdraw" element={<RequireAuth><WithdrawPage /></RequireAuth>} />
          <Route path="/assets/transfer" element={<RequireAuth><TransferPage /></RequireAuth>} />
          <Route path="/assets/bill" element={<RequireAuth><BillPage /></RequireAuth>} />
          <Route path="/assets/address" element={<RequireAuth><AddressBookPage /></RequireAuth>} />
          <Route path="/assets/flash" element={<RequireAuth><FlashPage /></RequireAuth>} />
          <Route path="/assets/account/:type" element={<RequireAuth><AccountDetailPage /></RequireAuth>} />
          <Route path="/assets/nft/manage" element={<RequireAuth><NftManagePage /></RequireAuth>} />
          <Route path="/nft" element={<NftPage />} />
          <Route path="/nft/collection/:id" element={<NftCollectionDetailPage />} />
          <Route path="/nft/item/:id" element={<NftItemDetailPage />} />
          <Route path="/support-entry" element={<SupportEntryPage />} />
          <Route path="/support-hub" element={<SupportHubPage />} />
          <Route path="/support/live" element={<SupportLivePage />} />
          <Route path="/legal/:type" element={<LegalDocumentPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/support/:id" element={<SupportDetailPage />} />
          <Route path="/support/ticket/new" element={<RequireAuth><SupportTicketCreatePage /></RequireAuth>} />
          <Route path="/support/ticket" element={<RequireAuth><SupportTicketListPage /></RequireAuth>} />
          <Route path="/support/ticket/:id" element={<RequireAuth><SupportTicketDetailPage /></RequireAuth>} />
          <Route path="/trade/kline" element={<KlinePage />} />
          <Route path="/finance/lock" element={<LockListPage />} />
          <Route path="/finance/lock/orders" element={<RequireAuth><LockOrdersPage /></RequireAuth>} />
          <Route path="/finance/lock/:id" element={<LockDetailPage />} />
          <Route path="/finance/portfolio/orders" element={<RequireAuth><PortfolioOrdersPage /></RequireAuth>} />
          <Route path="/finance/portfolio/:id" element={<PortfolioProductDetailPage />} />
          <Route path="/finance/loan/:id" element={<LoanDetailPage />} />
          <Route path="/finance/orders" element={<RequireAuth><MyFinanceOrdersPage /></RequireAuth>} />
          <Route path="/finance/ai/orders" element={<RequireAuth><AiOrdersPage /></RequireAuth>} />
          <Route path="/finance/ai/rules" element={<AiRulesPage />} />
          <Route path="/finance/ai/:id" element={<AiDetailPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <WalletLoginModal />
    </div>
  );
}
