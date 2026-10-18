import { useState } from 'react';
import { App, Button, Input, InputNumber, Modal, Space, Table, Tag } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePage } from '@/utils/usePage';
import http from '@/api/http';
import { exportCsv } from '@/utils/exportCsv';
import { useAdminStore } from '@/store/adminStore';
import { hasPermission } from '@/utils/permission';
import AdminUserSelect from '@/components/AdminUserSelect';
import SymbolSelect from '@/components/SymbolSelect';

interface SpotOrder {
  id: number;
  orderNo: string;
  userId: number;
  symbol: string;
  side: number;
  orderType: number;
  price: string;
  amount: string;
  dealAmount: string;
  dealTotal: string;
  fee: string;
  status: number;
  createdAt: string;
}

const STATUS: Record<number, { l: string; c: string }> = {
  0: { l: '待成交', c: 'orange' },
  1: { l: '部分成交', c: 'blue' },
  2: { l: '已成交', c: 'green' },
  3: { l: '已撤销', c: 'default' },
};

export default function SpotOrders() {
  const { data, total, pageNo, pageSize, loading, setPageNo, setPageSize, setExtraParams, reload } =
    usePage<SpotOrder>('/admin/trade/spot/page');
  const [searchParams] = useSearchParams();
  const [userId, setUserId] = useState<number | undefined>(searchParams.get('userId') ? Number(searchParams.get('userId')) : undefined);
  const [orderId, setOrderId] = useState<number | undefined>(searchParams.get('orderId') ? Number(searchParams.get('orderId')) : undefined);
  const [symbol, setSymbol] = useState(searchParams.get('symbol') ?? '');
  const { message } = App.useApp();
  const nav = useNavigate();
  const admin = useAdminStore((s) => s.admin);
  const canCancel = hasPermission(admin?.permissions, 'trade:cancel');
  const cancelOrder = async (row: SpotOrder) => {
    const reason = await promptReason(`撤销现货订单 ${row.orderNo}`, message.warning);
    if (!reason) return;
    await http.post(`/admin/trade/spot/${row.id}/cancel`, { reason });
    message.success('已撤销');
    reload();
  };
  const columns = [
    { title: '订单号', dataIndex: 'orderNo', width: 200 },
    { title: '用户ID', dataIndex: 'userId', width: 100 },
    { title: '交易对', dataIndex: 'symbol', width: 120 },
    { title: '方向', dataIndex: 'side', width: 70, render: (s: number) => s === 1 ? <Tag color="green">买</Tag> : <Tag color="red">卖</Tag> },
    { title: '类型', dataIndex: 'orderType', width: 80, render: (t: number) => t === 1 ? '限价' : '市价' },
    { title: '价格', dataIndex: 'price', width: 140 },
    { title: '数量', dataIndex: 'amount', width: 140 },
    { title: '成交量', dataIndex: 'dealAmount', width: 140 },
    { title: '成交额', dataIndex: 'dealTotal', width: 140 },
    { title: '手续费', dataIndex: 'fee', width: 120 },
    { title: '状态', dataIndex: 'status', width: 110, render: (s: number) => <Tag color={STATUS[s]?.c}>{STATUS[s]?.l}</Tag> },
    { title: '时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '操作',
      fixed: 'right' as const,
      width: 220,
      render: (_: unknown, row: SpotOrder) => (
        <Space className="admin-actions">
          <a onClick={() => nav(`/trade/spot-trades?orderId=${row.id}`)}>成交明细</a>
          <a onClick={() => nav(`/users?keyword=${row.userId}`)}>用户</a>
          {canCancel && (row.status === 0 || row.status === 1) ? <a onClick={() => cancelOrder(row)}>撤单</a> : null}
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-kicker">Trade</div>
          <h1 className="admin-page-title">现货订单</h1>
          <p className="admin-page-desc">按用户、订单和交易对筛选现货订单，快速追踪成交明细和撤单操作。</p>
        </div>
      </div>
      <div className="admin-filter-panel">
      <Space wrap>
        <AdminUserSelect value={userId} onChange={(v) => setUserId(v)} />
        <InputNumber placeholder="订单ID" value={orderId} onChange={(v) => setOrderId(v ?? undefined)} />
        <SymbolSelect tradeType="spot" value={symbol || undefined} onChange={(v) => setSymbol(v ?? '')} />
        <Button type="primary" onClick={() => { setPageNo(1); setExtraParams({ userId, orderId, symbol }); }}>
          查询
        </Button>
        <Button onClick={() => { exportCsv('现货订单', data, columns); message.success('已导出当前页数据'); }}>
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
          scroll={{ x: 1600 }}
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
      okText: '确认撤单',
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
