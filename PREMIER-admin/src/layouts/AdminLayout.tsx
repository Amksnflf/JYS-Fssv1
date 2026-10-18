import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Spin, Button } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  WalletOutlined,
  NotificationOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  StockOutlined,
  GoldOutlined,
  BarChartOutlined,
  AuditOutlined,
  BankOutlined,
  ControlOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  SwapOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import { useAdminStore } from '@/store/adminStore';
import { brandMarkUrl, brandName } from '@/brand';
import { hasPermission } from '@/utils/permission';

const { Header, Sider, Content } = Layout;

type AdminMenuItem = NonNullable<MenuProps['items']>[number] & { permission?: string; children?: AdminMenuItem[] };

export const menuItems: AdminMenuItem[] = [
  { key: '/', icon: <DashboardOutlined />, label: '工作台', permission: 'dashboard:view' },
  {
    key: 'user',
    icon: <TeamOutlined />,
    label: '用户中心',
    permission: 'user:view',
    children: [
      { key: '/users', label: '用户列表', permission: 'user:view' },
      { key: '/kyc', label: 'KYC 审核', permission: 'user:kyc' },
    ],
  },
  {
    key: 'finance-audit',
    icon: <AuditOutlined />,
    label: '财务审核',
    permission: 'asset:audit',
    children: [
      { key: '/finance/deposit', label: '储值审核', permission: 'asset:audit' },
      { key: '/finance/withdraw', label: '提现审核', permission: 'asset:audit' },
      { key: '/finance/adjust', label: '余额调整', permission: 'asset:adjust' },
    ],
  },
  {
    key: 'finance-ledger',
    icon: <WalletOutlined />,
    label: '资金流水',
    permission: 'asset:view',
    children: [
      { key: '/finance/deposit-addresses', label: '平台充值地址', permission: 'asset:deposit-address' },
      { key: '/finance/udun-config', label: '优盾接口配置', permission: 'asset:deposit-address' },
      { key: '/finance/deposit-channels', label: '充值通道配置', permission: 'asset:deposit-address' },
      { key: '/finance/udun-coins', label: '优盾币种映射', permission: 'asset:deposit-address' },
      { key: '/finance/udun-callbacks', label: '优盾回调日志', permission: 'asset:deposit-address' },
      { key: '/finance/bills', label: '账单查询', permission: 'asset:view' },
      { key: '/finance/transfers', label: '划转流水', permission: 'asset:view' },
      { key: '/finance/user-addresses', label: '提现地址簿', permission: 'asset:view' },
    ],
  },
  {
    key: '/product/symbol',
    icon: <StockOutlined />,
    label: '市场配置',
    permission: 'content:symbol',
  },
  {
    key: 'trade-orders',
    icon: <SwapOutlined />,
    label: '交易订单',
    permission: 'trade:view',
    children: [
      { key: '/trade/spot', label: '现货订单', permission: 'trade:view' },
      { key: '/trade/spot-trades', label: '现货成交', permission: 'trade:view' },
      { key: '/trade/perp-orders', label: '永续委托', permission: 'trade:view' },
      { key: '/trade/perp', label: '合约持仓', permission: 'trade:view' },
      { key: '/trade/option', label: '期权订单', permission: 'trade:view' },
      { key: '/trade/flash', label: '闪兑订单', permission: 'trade:view' },
    ],
  },
  {
    key: 'product',
    icon: <GoldOutlined />,
    label: '产品运营',
    permission: 'content:*',
    children: [
      { key: '/product/lock', label: '锁仓产品', permission: 'content:*' },
      { key: '/product/portfolio', label: '投资组合', permission: 'content:*' },
      { key: '/product/advanced', label: '扩展产品', permission: 'content:*' },
    ],
  },
  {
    key: 'ops-orders',
    icon: <ControlOutlined />,
    label: '运营订单',
    permission: 'ops:loan',
    children: [
      { key: '/product/loan-orders', label: '借币订单', permission: 'ops:loan' },
      { key: '/product/nft-orders', label: 'NFT 订单', permission: 'ops:nft' },
      { key: '/product/follow', label: '跟单管理', permission: 'ops:follow' },
    ],
  },
  {
    key: 'content',
    icon: <NotificationOutlined />,
    label: '内容运营',
    permission: 'content:*',
    children: [
      { key: '/content/news', label: '新闻', permission: 'content:*' },
      { key: '/content/announcements', label: '公告', permission: 'content:*' },
      { key: '/content/banners', label: 'Banner', permission: 'content:*' },
      { key: '/content/feedback', label: '用户反馈', permission: 'content:feedback' },
      { key: '/content/dynamics', label: '社区动态', permission: 'ops:dynamic' },
    ],
  },
  {
    key: 'report',
    icon: <BarChartOutlined />,
    label: '报表中心',
    permission: 'report:view',
    children: [
      { key: '/report/invite', label: '邀请报表', permission: 'report:view' },
      { key: '/report/daily-risk', label: '日报/风险', permission: 'report:view' },
    ],
  },
  {
    key: '/system/coins',
    icon: <BankOutlined />,
    label: '资产币种',
    permission: 'content:coin',
  },
  {
    key: 'support',
    icon: <CustomerServiceOutlined />,
    label: '客服中心',
    permission: 'support:view',
    children: [
      { key: '/support/tickets', label: '客服工单', permission: 'support:view' },
      { key: '/support/config', label: '客服通道配置', permission: 'support:config' },
    ],
  },
  {
    key: 'risk-config',
    icon: <SafetyCertificateOutlined />,
    label: '风控配置',
    permission: 'ops:risk',
    children: [
      { key: '/control/offset', label: '行情偏移', permission: 'control:offset' },
      { key: '/control/winrate', label: '期权胜率', permission: 'control:winrate' },
      { key: '/product/finance-control', label: '收益干预', permission: 'finance-control:*' },
      { key: '/system/risk-rules', label: '风控规则', permission: 'ops:risk' },
    ],
  },
  {
    key: 'system',
    icon: <SettingOutlined />,
    label: '权限设置',
    permission: 'system:*',
    children: [
      { key: '/system/admins', label: '管理员', permission: 'system:*' },
      { key: '/system/roles', label: '角色权限', permission: 'system:*' },
      { key: '/system/admin-log', label: '操作日志', permission: 'system:log' },
    ],
  },
  {
    key: 'system-config',
    icon: <FileTextOutlined />,
    label: '系统参数',
    permission: 'ops:i18n',
    children: [
      { key: '/system/i18n', label: '多语言词典', permission: 'ops:i18n' },
      { key: '/system/config', label: '系统参数', permission: 'ops:config' },
    ],
  },
];

function filterMenu(items: AdminMenuItem[], permissions?: string): MenuProps['items'] {
  return items
    .map((item) => {
      const children = item.children ? filterMenu(item.children, permissions) : undefined;
      const visible = hasPermission(permissions, item.permission) || Boolean(children?.length);
      if (!visible) return null;
      return { ...item, children };
    })
    .filter(Boolean) as MenuProps['items'];
}

function findMenuLabel(items: AdminMenuItem[], pathname: string): string {
  for (const item of items) {
    if ('label' in item && item.key === pathname && typeof item.label === 'string') return item.label;
    if (item.children) {
      const child = findMenuLabel(item.children, pathname);
      if (child) return child;
    }
  }
  return '后台管理';
}

function findParentKey(items: AdminMenuItem[], pathname: string): string | undefined {
  for (const item of items) {
    if (!item.children) continue;
    if (item.children.some((child) => child && child.key === pathname)) return String(item.key);
    const nested = findParentKey(item.children, pathname);
    if (nested) return nested;
  }
  return undefined;
}

export function firstAccessibleMenuPath(permissions?: string): string {
  const visit = (items: AdminMenuItem[]): string | undefined => {
    for (const item of items) {
      if (item.children) {
        const child = visit(item.children);
        if (child) return child;
      }
      const key = String(item.key ?? '');
      if (key.startsWith('/') && hasPermission(permissions, item.permission)) return key;
    }
    return undefined;
  };
  return visit(menuItems) ?? '/';
}

export default function AdminLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const token = useAdminStore((s) => s.token);
  const admin = useAdminStore((s) => s.admin);
  const authStatus = useAdminStore((s) => s.authStatus);
  const refresh = useAdminStore((s) => s.refresh);
  const logout = useAdminStore((s) => s.logout);

  useEffect(() => {
    if (token && !admin) refresh();
  }, [token, admin, refresh]);

  useEffect(() => {
    const parentKey = findParentKey(menuItems, loc.pathname);
    setOpenKeys(parentKey ? [parentKey] : []);
  }, [loc.pathname]);

  if (!token) return <Navigate to="/login" replace />;
  if (!admin && authStatus !== 'error') {
    return (
      <div className="admin-page">
        <div className="admin-panel" style={{ padding: 48, textAlign: 'center' }}>
          <Spin tip="正在加载管理员信息" />
        </div>
      </div>
    );
  }

  const onLogout = async () => {
    await logout();
    nav('/login');
  };

  const pageTitle = findMenuLabel(menuItems, loc.pathname);

  return (
    <Layout className={`admin-shell${collapsed ? ' sider-collapsed' : ''}`}>
      <Sider
        collapsible
        trigger={null}
        breakpoint="lg"
        collapsed={collapsed}
        onCollapse={setCollapsed}
        collapsedWidth={80}
        theme="light"
        width={236}
        className="admin-sider"
      >
        <div className="admin-brand">
          <img src={brandMarkUrl} alt={brandName} className="admin-brand-mark" />
          {!collapsed && (
            <div>
              <div className="admin-brand-title">{brandName} 后台</div>
              <div className="admin-brand-subtitle">运营管理中心</div>
            </div>
          )}
        </div>
        <Menu
          mode="inline"
          theme="light"
          className="admin-menu"
          items={filterMenu(menuItems, admin?.permissions)}
          openKeys={openKeys}
          onOpenChange={(keys) => setOpenKeys(keys as string[])}
          selectedKeys={[loc.pathname]}
          onClick={(e) => nav(e.key)}
        />
      </Sider>
      <Layout className="admin-main">
        <Header className="admin-header">
          <div className="admin-header-title">
            <strong>{pageTitle}</strong>
            <span>管理业务数据、审核流程与系统配置</span>
          </div>
          <div className="admin-header-actions">
            <Button
              type="text"
              className="admin-sider-trigger"
              aria-label={collapsed ? '展开菜单' : '折叠菜单'}
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
            <Dropdown
              menu={{
                items: [
                  { key: 'logout', icon: <LogoutOutlined />, label: '退出', onClick: onLogout },
                ],
              }}
            >
              <div className="admin-user">
                <Avatar size={30}>{admin?.nickname?.[0] ?? 'A'}</Avatar>
                <span className="admin-user-name">{admin?.nickname ?? admin?.username ?? 'admin'}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
