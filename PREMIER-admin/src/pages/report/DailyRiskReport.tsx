import { useEffect, useState } from 'react';
import { App, Button, Card, Col, Row, Space, Table, Tabs } from 'antd';
import { useNavigate } from 'react-router-dom';
import http from '@/api/http';
import { exportCsv } from '@/utils/exportCsv';

export default function DailyRiskReport() {
  const [daily, setDaily] = useState<Record<string, number>>({});
  const [risk, setRisk] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [dailyResp, riskResp] = await Promise.all([
        http.get<Record<string, number>, Record<string, number>>('/admin/stats/daily'),
        http.get<Record<string, any[]>, Record<string, any[]>>('/admin/stats/risk'),
      ]);
      setDaily(dailyResp ?? {});
      setRisk(riskResp ?? {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cards = [
    ['newUsers', '今日新增用户'],
    ['spotOrders', '现货订单'],
    ['perpOrders', '合约订单'],
    ['optionOrders', '期权订单'],
    ['deposits', '充值单'],
    ['withdraws', '提现单'],
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-kicker">Report</div>
          <h1 className="admin-page-title">日报/风险</h1>
          <p className="admin-page-desc">汇总每日关键数据和高风险待办，便于运营与风控快速处理。</p>
        </div>
        <Button type="primary" loading={loading} onClick={load}>刷新</Button>
      </div>
      <div className="admin-filter-panel">
        <Space wrap>
          <Button onClick={() => { exportCsv('高杠杆持仓', risk.highLeveragePositions ?? [], buildRiskColumns('/trade/perp', nav, riskKeys(risk.highLeveragePositions))); message.success('已导出高杠杆持仓'); }}>导出高杠杆持仓</Button>
          <Button onClick={() => { exportCsv('待处理提现', risk.pendingWithdraws ?? [], buildRiskColumns('/finance/withdraw', nav, riskKeys(risk.pendingWithdraws))); message.success('已导出待处理提现'); }}>导出待处理提现</Button>
          <Button onClick={() => { exportCsv('进行中期权', risk.runningOptions ?? [], buildRiskColumns('/trade/option', nav, riskKeys(risk.runningOptions))); message.success('已导出进行中期权'); }}>导出进行中期权</Button>
        </Space>
      </div>
      <Row gutter={[16, 16]}>
        {cards.map(([key, label]) => (
          <Col xs={12} md={8} lg={4} key={key}>
            <Card size="small" className="admin-stat-card">
              <div style={{ color: '#888', fontSize: 12 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>{daily[key] ?? 0}</div>
            </Card>
          </Col>
        ))}
      </Row>
      <div className="admin-tabs-panel">
        <Tabs
          items={[
            {
              key: 'positions',
              label: '高杠杆持仓',
              children: <RiskTable data={risk.highLeveragePositions ?? []} actionPath="/trade/perp" />,
            },
            {
              key: 'withdraws',
              label: '待处理提现',
              children: <RiskTable data={risk.pendingWithdraws ?? []} actionPath="/finance/withdraw" />,
            },
            {
              key: 'options',
              label: '进行中期权',
              children: <RiskTable data={risk.runningOptions ?? []} actionPath="/trade/option" />,
            },
          ]}
        />
      </div>
    </div>
  );
}

function RiskTable({ data, actionPath }: { data: any[]; actionPath: string }) {
  const nav = useNavigate();
  const keys = riskKeys(data);
  return (
    <div className="admin-table-panel">
      <Table
        size="small"
        rowKey={(r) => r.id}
        dataSource={data}
        columns={buildRiskColumns(actionPath, nav, keys)}
        scroll={{ x: 900 }}
      />
    </div>
  );
}

function riskKeys(data?: any[]) {
  return Object.keys(data?.[0] ?? {}).slice(0, 8);
}

function buildRiskColumns(actionPath: string, nav: (path: string) => void, keys?: string[]) {
  const visibleKeys = keys ?? [];
  const columns = visibleKeys.map((k) => ({ title: k, dataIndex: k, ellipsis: true }));
  columns.push({
    title: '操作',
    dataIndex: 'id',
    ellipsis: false,
    render: (_: unknown, r: any) => (
      <a onClick={() => nav(`${actionPath}${r.userId ? `?userId=${r.userId}` : ''}`)}>去处理</a>
    ),
  } as any);
  return columns;
}
