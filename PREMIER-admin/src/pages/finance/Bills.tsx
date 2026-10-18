import { useState } from 'react';
import { App, Button, Input, Space, Table } from 'antd';
import { usePage } from '@/utils/usePage';
import { exportCsv } from '@/utils/exportCsv';
import AdminUserSelect from '@/components/AdminUserSelect';
import CoinSelect from '@/components/CoinSelect';

interface Bill {
  id: number;
  userId: number;
  accountType: number;
  coin: string;
  bizType: string;
  bizId: string;
  amount: string;
  balanceAfter: string;
  remark: string;
  createdAt: string;
}

const ACC: Record<number, string> = { 1: '现货', 2: '交易', 3: '理财' };

export default function BillsPage() {
  const { data, total, pageNo, pageSize, loading, setPageNo, setPageSize, setExtraParams, extraParams } =
    usePage<Bill>('/admin/asset/bill/page');
  const [userId, setUserId] = useState<number | undefined>(() => toNumber(extraParams.userId));
  const [coin, setCoin] = useState(() => String(extraParams.coin ?? ''));
  const [bizType, setBizType] = useState(() => String(extraParams.bizType ?? ''));
  const { message } = App.useApp();
  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '用户ID', dataIndex: 'userId', width: 100 },
    { title: '账户', dataIndex: 'accountType', width: 80, render: (v: number) => ACC[v] },
    { title: '币种', dataIndex: 'coin', width: 100 },
    { title: '业务', dataIndex: 'bizType', width: 120 },
    { title: '业务ID', dataIndex: 'bizId', width: 200 },
    { title: '变动', dataIndex: 'amount', width: 160 },
    { title: '变动后', dataIndex: 'balanceAfter', width: 160 },
    { title: '备注', dataIndex: 'remark' },
    { title: '时间', dataIndex: 'createdAt', width: 180 },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <AdminUserSelect value={userId} onChange={(v) => setUserId(v)} />
        <CoinSelect value={coin || undefined} onChange={(v) => setCoin(v ?? '')} />
        <Input placeholder="业务类型" value={bizType} onChange={(e) => setBizType(e.target.value)} style={{ width: 140 }} />
        <Button
          type="primary"
          onClick={() => {
            setPageNo(1);
            setExtraParams({ userId, coin, bizType });
          }}
        >
          查询
        </Button>
        <Button onClick={() => { exportCsv('账单查询', data, columns); message.success('已导出当前页数据'); }}>
          导出当前页
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={{ current: pageNo, pageSize, total, onChange: (p, ps) => { setPageNo(p); setPageSize(ps); } }}
        columns={columns}
        scroll={{ x: 1400 }}
      />
    </div>
  );
}

function toNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
