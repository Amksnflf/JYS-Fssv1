import { useState } from 'react';
import { App, Button, Input, Modal, Select, Space, Table, Tag } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePage } from '@/utils/usePage';
import http from '@/api/http';
import { exportCsv } from '@/utils/exportCsv';
import { useAdminStore } from '@/store/adminStore';
import { hasPermission } from '@/utils/permission';
import AdminUserSelect from '@/components/AdminUserSelect';
import SymbolSelect from '@/components/SymbolSelect';

interface OptionOrder {
  id: number;
  orderNo: string;
  userId: number;
  symbol: string;
  direction: number;
  periodSeconds: number;
  payoutRate: string;
  amount: string;
  openPrice: string;
  settlePrice?: string;
  result?: number;
  profit?: string;
  status: number;
  createdAt: string;
}

export default function OptionOrders() {
  const { data, total, pageNo, pageSize, loading, setPageNo, setPageSize, setExtraParams, reload } =
    usePage<OptionOrder>('/admin/trade/option/page');
  const [searchParams] = useSearchParams();
  const [userId, setUserId] = useState<number | undefined>(searchParams.get('userId') ? Number(searchParams.get('userId')) : undefined);
  const [status, setStatus] = useState<number | undefined>(searchParams.get('status') ? Number(searchParams.get('status')) : undefined);
  const [symbol, setSymbol] = useState(searchParams.get('symbol') ?? '');
  const { message } = App.useApp();
  const nav = useNavigate();
  const admin = useAdminStore((s) => s.admin);
  const canCancel = hasPermission(admin?.permissions, 'trade:cancel');
  const cancelOrder = async (row: OptionOrder) => {
    const reason = await promptReason(`取消期权订单 ${row.orderNo}`, message.warning);
    if (!reason) return;
    await http.post(`/admin/trade/option/${row.id}/cancel`, { reason });
    message.success('已取消');
    reload();
  };
  const columns = [
    { title: '订单号', dataIndex: 'orderNo', width: 200 },
    { title: '用户ID', dataIndex: 'userId', width: 100 },
    { title: '交易对', dataIndex: 'symbol', width: 120 },
    { title: '方向', dataIndex: 'direction', width: 80, render: (d: number) => d === 1 ? <Tag color="green">涨</Tag> : <Tag color="red">跌</Tag> },
    { title: '周期', dataIndex: 'periodSeconds', width: 80, render: (s: number) => `${s}s` },
    { title: '收益率', dataIndex: 'payoutRate', width: 100, render: (r: string) => `${(Number(r) * 100).toFixed(0)}%` },
    { title: '金额', dataIndex: 'amount', width: 120 },
    { title: '开仓价', dataIndex: 'openPrice', width: 140 },
    { title: '结算价', dataIndex: 'settlePrice', width: 140 },
    {
      title: '结果',
      dataIndex: 'result',
      width: 80,
      render: (r: number) => r === 1 ? <Tag color="green">赢</Tag> : r === 2 ? <Tag color="red">输</Tag> : r === 3 ? <Tag>平</Tag> : '-',
    },
    { title: '盈亏', dataIndex: 'profit', width: 120 },
    { title: '状态', dataIndex: 'status', width: 100, render: (s: number) => s === 1 ? <Tag color="green">已结算</Tag> : s === 3 ? <Tag>已取消</Tag> : <Tag color="orange">进行中</Tag> },
    { title: '时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '操作',
      fixed: 'right' as const,
      width: 150,
      render: (_: unknown, row: OptionOrder) => (
        <Space className="admin-actions">
          <a onClick={() => nav(`/users?keyword=${row.userId}`)}>用户</a>
          {canCancel && row.status !== 1 && row.status !== 3 ? <a onClick={() => cancelOrder(row)}>取消</a> : null}
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-kicker">Trade</div>
          <h1 className="admin-page-title">期权订单</h1>
          <p className="admin-page-desc">查看期权订单方向、周期、结算结果和盈亏，支持按用户与状态筛选。</p>
        </div>
      </div>
      <div className="admin-filter-panel">
      <Space wrap>
        <AdminUserSelect value={userId} onChange={(v) => setUserId(v)} />
        <Select allowClear placeholder="状态" value={status} style={{ width: 140 }}
          onChange={(v) => setStatus(v)}
          options={[{ value: 0, label: '进行中' }, { value: 1, label: '已结算' }]} />
        <SymbolSelect tradeType="option" value={symbol || undefined} onChange={(v) => setSymbol(v ?? '')} />
        <Button type="primary" onClick={() => { setPageNo(1); setExtraParams({ userId, status, symbol }); }}>
          查询
        </Button>
        <Button onClick={() => { exportCsv('期权订单', data, columns); message.success('已导出当前页数据'); }}>
          导出当前页
        </Button>
      </Space>
      </div>
      <div className="admin-table-panel">
        <div className="admin-table-header">
          <div>
            <div className="admin-table-title">订单列表</div>
            <div className="admin-table-meta">共 {total} 条记录</div>
          </div>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          pagination={{ current: pageNo, pageSize, total, showSizeChanger: true, onChange: (p, ps) => { setPageNo(p); setPageSize(ps); } }}
          columns={columns}
          scroll={{ x: 1800 }}
        />
      </div>
    </div>
  );
}

function promptReason(title: string, warn: (content: string) => void): Promise<string | null> {
  return new Promise((resolve) => {
    let value = '';
    Modal.confirm({
      title,
      okText: '确认取消',
      okType: 'danger',
      content: <Input.TextArea rows={3} placeholder="操作原因，必填" onChange={(e) => { value = e.target.value; }} />,
      onOk: () => {
        if (!value.trim()) {
          warn('请填写操作原因');
          return Promise.reject();
        }
        resolve(value.trim());
      },
      onCancel: () => resolve(null),
    });
  });
}
