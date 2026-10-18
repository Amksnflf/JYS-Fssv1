import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Row, Space, Statistic, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import http from '@/api/http';

interface Stats {
  totalUsers: number;
  todayNewUsers: number;
  pendingKyc: number;
  pendingDeposit: number;
  pendingWithdraw: number;
  openPerpPositions: number;
  runningOptions: number;
  todaySpotOrders: number;
}

export default function Dashboard() {
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const nav = useNavigate();

  const load = () => {
    setLoading(true);
    setError(null);
    http.get<Stats, Stats>('/admin/stats/dashboard')
      .then((res) => {
        setData(res);
        setUpdatedAt(new Date().toLocaleString());
      })
      .catch((e) => setError(e?.message || '工作台数据加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (!data && loading) {
    return (
      <div className="admin-page">
        <div className="admin-panel" style={{ padding: 48, textAlign: 'center' }}>
          <Spin />
        </div>
      </div>
    );
  }
  if (!data && error) {
    return (
      <div className="admin-page">
        <Alert
          type="error"
          showIcon
          message="工作台数据加载失败"
          description={error}
          action={<Button onClick={load}>重试</Button>}
        />
      </div>
    );
  }
  if (!data) return null;
  const items = [
    { t: '总用户数', v: data.totalUsers, d: '平台累计注册用户' },
    { t: '今日新增用户', v: data.todayNewUsers, d: '今日新增注册' },
    { t: '待审 KYC', v: data.pendingKyc, d: '需要人工审核' },
    { t: '待审储值', v: data.pendingDeposit, d: '充值入账待处理' },
    { t: '待审提现', v: data.pendingWithdraw, d: '提现风控待确认' },
    { t: '当前合约持仓', v: data.openPerpPositions, d: '实时风险关注' },
    { t: '进行中期权单', v: data.runningOptions, d: '当前运行订单' },
    { t: '今日现货订单', v: data.todaySpotOrders, d: '现货订单活跃度' },
  ];
  const quickLinks = [
    { label: '待审 KYC', path: '/kyc' },
    { label: '待审储值', path: '/finance/deposit' },
    { label: '待审提现', path: '/finance/withdraw' },
    { label: '风险持仓', path: '/trade/perp' },
    { label: '进行中期权', path: '/trade/option?status=0' },
    { label: '用户列表', path: '/users' },
  ];
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-kicker">Overview</div>
          <h1 className="admin-page-title">工作台</h1>
          <p className="admin-page-desc">集中查看用户增长、审核待办、交易风险和订单活跃度，快速进入高频运营任务。</p>
        </div>
        <Space direction="vertical" align="end">
          <Button type="primary" loading={loading} onClick={load}>刷新数据</Button>
          {updatedAt && <span className="admin-table-meta">更新时间：{updatedAt}</span>}
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {items.map((it) => (
          <Col xs={24} sm={12} md={8} lg={6} key={it.t}>
            <Card className="admin-stat-card">
              <Statistic title={it.t} value={it.v} />
              <div className="admin-table-meta" style={{ marginTop: 10 }}>{it.d}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="admin-quick-card" title="快捷入口">
        <Space wrap>
          {quickLinks.map((item) => (
            <Button key={item.path} onClick={() => nav(item.path)}>
              {item.label}
            </Button>
          ))}
        </Space>
      </Card>
    </div>
  );
}
