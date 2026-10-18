import { Routes, Route, Navigate } from 'react-router-dom';
import type React from 'react';
import AdminLayout from './layouts/AdminLayout';
import PermissionRoute from './components/PermissionRoute';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserList from './pages/user/UserList';
import KycAudit from './pages/user/KycAudit';
import DepositAudit from './pages/finance/DepositAudit';
import WithdrawAudit from './pages/finance/WithdrawAudit';
import AdjustPage from './pages/finance/Adjust';
import BillsPage from './pages/finance/Bills';
import SpotOrders from './pages/trade/SpotOrders';
import PerpPositions from './pages/trade/PerpPositions';
import OptionOrders from './pages/trade/OptionOrders';
import FlashOrders from './pages/trade/FlashOrders';
import QuoteOffsetPage from './pages/control/QuoteOffset';
import WinRatePage from './pages/control/WinRate';
import SymbolListPage from './pages/product/SymbolList';
import LockProductListPage from './pages/product/LockProductList';
import PortfolioProductListPage from './pages/product/PortfolioProductList';
import AdvancedProductList from './pages/product/AdvancedProductList';
import NewsListPage from './pages/content/NewsList';
import AnnouncementList from './pages/content/AnnouncementList';
import BannerListPage from './pages/content/BannerList';
import CoinList from './pages/system/CoinList';
import AdminLogPage from './pages/system/AdminLog';
import AdminUserListPage from './pages/system/AdminUserList';
import RoleListPage from './pages/system/RoleList';
import InviteReportPage from './pages/report/InviteReport';
import DailyRiskReport from './pages/report/DailyRiskReport';
import DepositAddresses from './pages/finance/DepositAddresses';
import DepositChannels from './pages/finance/DepositChannels';
import UdunConfig from './pages/finance/UdunConfig';
import UdunCoins from './pages/finance/UdunCoins';
import UdunCallbacks from './pages/finance/UdunCallbacks';
import Transfers from './pages/finance/Transfers';
import UserAddresses from './pages/finance/UserAddresses';
import SpotTrades from './pages/trade/SpotTrades';
import PerpOrders from './pages/trade/PerpOrders';
import LoanOrders from './pages/product/LoanOrders';
import NftOrders from './pages/product/NftOrders';
import FollowManage from './pages/product/FollowManage';
import FinanceControl from './pages/product/FinanceControl';
import FeedbackList from './pages/content/FeedbackList';
import DynamicList from './pages/content/DynamicList';
import RiskRules from './pages/system/RiskRules';
import I18nDict from './pages/system/I18nDict';
import SystemConfig from './pages/system/SystemConfig';
import TicketListPage from './pages/support/TicketList';
import SupportConfigPage from './pages/support/SupportConfig';

function guard(element: React.ReactNode, permission: string) {
  return <PermissionRoute permission={permission}>{element}</PermissionRoute>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AdminLayout />}>
        <Route path="/" element={guard(<Dashboard />, 'dashboard:view')} />
        <Route path="/users" element={guard(<UserList />, 'user:view')} />
        <Route path="/kyc" element={guard(<KycAudit />, 'user:kyc')} />
        <Route path="/finance/deposit-addresses" element={guard(<DepositAddresses />, 'asset:deposit-address')} />
        <Route path="/finance/udun-config" element={guard(<UdunConfig />, 'asset:deposit-address')} />
        <Route path="/finance/deposit-channels" element={guard(<DepositChannels />, 'asset:deposit-address')} />
        <Route path="/finance/udun-coins" element={guard(<UdunCoins />, 'asset:deposit-address')} />
        <Route path="/finance/udun-callbacks" element={guard(<UdunCallbacks />, 'asset:deposit-address')} />
        <Route path="/finance/deposit" element={guard(<DepositAudit />, 'asset:audit')} />
        <Route path="/finance/withdraw" element={guard(<WithdrawAudit />, 'asset:audit')} />
        <Route path="/finance/adjust" element={guard(<AdjustPage />, 'asset:adjust')} />
        <Route path="/finance/bills" element={guard(<BillsPage />, 'asset:view')} />
        <Route path="/finance/transfers" element={guard(<Transfers />, 'asset:view')} />
        <Route path="/finance/user-addresses" element={guard(<UserAddresses />, 'asset:view')} />
        <Route path="/trade/spot" element={guard(<SpotOrders />, 'trade:view')} />
        <Route path="/trade/spot-trades" element={guard(<SpotTrades />, 'trade:view')} />
        <Route path="/trade/perp-orders" element={guard(<PerpOrders />, 'trade:view')} />
        <Route path="/trade/perp" element={guard(<PerpPositions />, 'trade:view')} />
        <Route path="/trade/option" element={guard(<OptionOrders />, 'trade:view')} />
        <Route path="/trade/flash" element={guard(<FlashOrders />, 'trade:view')} />
        <Route path="/control/offset" element={guard(<QuoteOffsetPage />, 'control:offset')} />
        <Route path="/control/winrate" element={guard(<WinRatePage />, 'control:winrate')} />
        <Route path="/product/symbol" element={guard(<SymbolListPage />, 'content:symbol')} />
        <Route path="/product/lock" element={guard(<LockProductListPage />, 'content:*')} />
        <Route path="/product/portfolio" element={guard(<PortfolioProductListPage />, 'content:*')} />
        <Route path="/product/advanced" element={guard(<AdvancedProductList />, 'content:*')} />
        <Route path="/product/loan-orders" element={guard(<LoanOrders />, 'ops:loan')} />
        <Route path="/product/nft-orders" element={guard(<NftOrders />, 'ops:nft')} />
        <Route path="/product/follow" element={guard(<FollowManage />, 'ops:follow')} />
        <Route path="/product/finance-control" element={guard(<FinanceControl />, 'finance-control:*')} />
        <Route path="/content/news" element={guard(<NewsListPage />, 'content:*')} />
        <Route path="/content/announcements" element={guard(<AnnouncementList />, 'content:*')} />
        <Route path="/content/banners" element={guard(<BannerListPage />, 'content:*')} />
        <Route path="/content/feedback" element={guard(<FeedbackList />, 'content:feedback')} />
        <Route path="/content/dynamics" element={guard(<DynamicList />, 'ops:dynamic')} />
        <Route path="/support/tickets" element={guard(<TicketListPage />, 'support:view')} />
        <Route path="/support/config" element={guard(<SupportConfigPage />, 'support:config')} />
        <Route path="/report/invite" element={guard(<InviteReportPage />, 'report:view')} />
        <Route path="/report/daily-risk" element={guard(<DailyRiskReport />, 'report:view')} />
        <Route path="/system/coins" element={guard(<CoinList />, 'content:coin')} />
        <Route path="/system/admins" element={guard(<AdminUserListPage />, 'system:*')} />
        <Route path="/system/roles" element={guard(<RoleListPage />, 'system:*')} />
        <Route path="/system/admin-log" element={guard(<AdminLogPage />, 'system:log')} />
        <Route path="/system/risk-rules" element={guard(<RiskRules />, 'ops:risk')} />
        <Route path="/system/i18n" element={guard(<I18nDict />, 'ops:i18n')} />
        <Route path="/system/config" element={guard(<SystemConfig />, 'ops:config')} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
