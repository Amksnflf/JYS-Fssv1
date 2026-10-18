import { useState } from 'react';
import { App, Button, Descriptions, Input, InputNumber, Modal, Space, Table } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePage } from '@/utils/usePage';
import { exportCsv } from '@/utils/exportCsv';

interface FlashOrder {
  id: number;
  orderNo: string;
  userId: number;
  fromCoin: string;
  toCoin: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  feeRate: string;
  createdAt: string;
}

export default function FlashOrders() {
  const { data, total, pageNo, pageSize, loading, setPageNo, setPageSize, setExtraParams } =
    usePage<FlashOrder>('/admin/trade/flash/page');
  const [searchParams] = useSearchParams();
  const [userId, setUserId] = useState<number | undefined>(searchParams.get('userId') ? Number(searchParams.get('userId')) : undefined);
  const [fromCoin, setFromCoin] = useState('');
  const [toCoin, setToCoin] = useState('');
  const [current, setCurrent] = useState<FlashOrder | null>(null);
  const nav = useNavigate();
  const { message } = App.useApp();
  const columns = [
    { title: '订单号', dataIndex: 'orderNo', width: 200 },
    { title: '用户ID', dataIndex: 'userId', width: 100 },
    { title: '从', dataIndex: 'fromCoin', width: 100 },
    { title: '到', dataIndex: 'toCoin', width: 100 },
    { title: '支出', dataIndex: 'fromAmount', width: 160 },
    { title: '获得', dataIndex: 'toAmount', width: 160 },
    { title: '兑换率', dataIndex: 'rate', width: 160 },
    { title: '手续费率', dataIndex: 'feeRate', width: 100, render: (r: string) => `${(Number(r) * 100).toFixed(2)}%` },
    { title: '时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '操作',
      width: 120,
      render: (_: unknown, r: FlashOrder) => (
        <Space>
          <a onClick={() => setCurrent(r)}>详情</a>
          <a onClick={() => nav(`/users?keyword=${r.userId}`)}>用户</a>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <InputNumber placeholder="用户ID" value={userId} onChange={(v) => setUserId(v ?? undefined)} />
        <Input placeholder="从币种" value={fromCoin} onChange={(e) => setFromCoin(e.target.value)} style={{ width: 100 }} />
        <Input placeholder="到币种" value={toCoin} onChange={(e) => setToCoin(e.target.value)} style={{ width: 100 }} />
        <Button type="primary" onClick={() => { setPageNo(1); setExtraParams({ userId, fromCoin, toCoin }); }}>
          查询
        </Button>
        <Button onClick={() => { exportCsv('闪兑订单', data, columns); message.success('已导出当前页数据'); }}>
          导出当前页
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={{ current: pageNo, pageSize, total, onChange: (p, ps) => { setPageNo(p); setPageSize(ps); } }}
        columns={columns}
      />
      <Modal title={`闪兑订单 ${current?.orderNo ?? ''}`} open={Boolean(current)} onCancel={() => setCurrent(null)} footer={null}>
        <Descriptions size="small" bordered column={1}>
          <Descriptions.Item label="订单号">{current?.orderNo}</Descriptions.Item>
          <Descriptions.Item label="用户ID">{current?.userId}</Descriptions.Item>
          <Descriptions.Item label="兑换">{current ? `${current.fromAmount} ${current.fromCoin} -> ${current.toAmount} ${current.toCoin}` : '-'}</Descriptions.Item>
          <Descriptions.Item label="兑换率">{current?.rate}</Descriptions.Item>
          <Descriptions.Item label="手续费率">{current ? `${(Number(current.feeRate) * 100).toFixed(2)}%` : '-'}</Descriptions.Item>
          <Descriptions.Item label="时间">{current?.createdAt}</Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  );
}
