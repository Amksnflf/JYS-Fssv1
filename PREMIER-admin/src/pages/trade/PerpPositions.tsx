import { useState } from 'react';
import { App, Button, Input, InputNumber, Select, Space, Table, Tag } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePage } from '@/utils/usePage';
import http from '@/api/http';
import { exportCsv } from '@/utils/exportCsv';

interface PerpPos {
  id: number;
  userId: number;
  symbol: string;
  side: number;
  marginMode: number;
  leverage: number;
  amount: string;
  openPrice: string;
  liqPrice: string;
  margin: string;
  realizedPnl: string;
  status: number;
  createdAt: string;
}

const STATUS: Record<number, { l: string; c: string }> = {
  1: { l: '持仓中', c: 'blue' },
  2: { l: '已平仓', c: 'default' },
  3: { l: '已强平', c: 'red' },
};

export default function PerpPositions() {
  const { data, total, pageNo, pageSize, loading, setPageNo, setPageSize, setExtraParams, reload } =
    usePage<PerpPos>('/admin/trade/perp/position/page');
  const [searchParams] = useSearchParams();
  const [userId, setUserId] = useState<number | undefined>(searchParams.get('userId') ? Number(searchParams.get('userId')) : undefined);
  const [status, setStatus] = useState<number | undefined>();
  const { modal, message } = App.useApp();
  const nav = useNavigate();

  const intervene = (row: PerpPos, type: 'close' | 'liquidate') => {
    let reason = '';
    let markPrice: string | undefined;
    modal.confirm({
      title: type === 'close' ? '确认强制平仓？' : '确认强制爆仓？',
      okText: type === 'close' ? '确认平仓' : '确认爆仓',
      okType: 'danger',
      content: (
        <div>
          <div style={{ marginBottom: 8 }}>
            仓位 #{row.id} {row.symbol}，数量 {row.amount}，开仓价 {row.openPrice}，强平价 {row.liqPrice}，已实现PnL {row.realizedPnl}
          </div>
          <Input placeholder="标记价（不填则按系统当前价）" style={{ marginBottom: 8 }} onChange={(e) => (markPrice = e.target.value)} />
          <Input.TextArea rows={3} placeholder="操作原因，必填" onChange={(e) => (reason = e.target.value)} />
        </div>
      ),
      onOk: async () => {
        if (!reason.trim()) {
          message.warning('请填写操作原因');
          return Promise.reject();
        }
        await http.post(`/admin/trade/perp/position/${row.id}/${type === 'close' ? 'force-close' : 'force-liquidate'}`, {
          reason,
          markPrice: markPrice || undefined,
        });
        message.success('操作成功');
        setExtraParams({ userId, status });
        reload();
      },
    });
  };
  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '用户ID', dataIndex: 'userId', width: 100 },
    { title: '交易对', dataIndex: 'symbol', width: 120 },
    { title: '方向', dataIndex: 'side', width: 80, render: (s: number) => s === 1 ? <Tag color="green">多</Tag> : <Tag color="red">空</Tag> },
    { title: '保证金模式', dataIndex: 'marginMode', width: 110, render: (m: number) => m === 1 ? '逐仓' : '全仓' },
    { title: '杠杆', dataIndex: 'leverage', width: 80, render: (l: number) => `${l}x` },
    { title: '数量', dataIndex: 'amount', width: 140 },
    { title: '开仓价', dataIndex: 'openPrice', width: 140 },
    { title: '强平价', dataIndex: 'liqPrice', width: 140 },
    { title: '保证金', dataIndex: 'margin', width: 140 },
    { title: '已实现PnL', dataIndex: 'realizedPnl', width: 140 },
    { title: '状态', dataIndex: 'status', width: 100, render: (s: number) => <Tag color={STATUS[s]?.c}>{STATUS[s]?.l}</Tag> },
    { title: '时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '干预',
      fixed: 'right' as const,
      width: 160,
      render: (_: unknown, r: PerpPos) => r.status === 1 ? (
        <Space className="admin-actions" wrap>
          <a onClick={() => nav(`/users?keyword=${r.userId}`)}>用户</a>
          <a onClick={() => intervene(r, 'close')}>强制平仓</a>
          <a className="admin-danger-link" onClick={() => intervene(r, 'liquidate')}>爆仓</a>
        </Space>
      ) : '-',
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-kicker">Risk</div>
          <h1 className="admin-page-title">合约持仓</h1>
          <p className="admin-page-desc">关注持仓状态、杠杆、保证金和强平风险，支持必要的人工干预。</p>
        </div>
      </div>
      <div className="admin-filter-panel">
      <Space wrap>
        <InputNumber placeholder="用户ID" value={userId} onChange={(v) => setUserId(v ?? undefined)} />
        <Select
          allowClear placeholder="状态" value={status}
          style={{ width: 140 }}
          onChange={(v) => setStatus(v)}
          options={Object.entries(STATUS).map(([k, v]) => ({ value: Number(k), label: v.l }))}
        />
        <Button type="primary" onClick={() => { setPageNo(1); setExtraParams({ userId, status }); }}>
          查询
        </Button>
        <Button onClick={() => { exportCsv('合约持仓', data, columns); message.success('已导出当前页数据'); }}>
          导出当前页
        </Button>
      </Space>
      </div>
      <div className="admin-table-panel">
        <div className="admin-table-header">
          <div>
            <div className="admin-table-title">持仓列表</div>
            <div className="admin-table-meta">共 {total} 条记录</div>
          </div>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          pagination={{ current: pageNo, pageSize, total, showSizeChanger: true, onChange: (p, ps) => { setPageNo(p); setPageSize(ps); } }}
          columns={columns}
          scroll={{ x: 1860 }}
        />
      </div>
    </div>
  );
}
