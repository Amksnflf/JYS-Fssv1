import { useState } from 'react';
import { App, Button, Input, Modal, Select, Space, Table, Tag } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePage } from '@/utils/usePage';
import http from '@/api/http';
import { exportCsv } from '@/utils/exportCsv';
import AdminUserSelect from '@/components/AdminUserSelect';
import CoinSelect from '@/components/CoinSelect';

interface Deposit {
  id: number;
  orderNo: string;
  userId: number;
  coin: string;
  chain: string;
  amount: string;
  txHash?: string;
  status: number;
  createdAt: string;
}

const STATUS: Record<number, { label: string; color: string }> = {
  0: { label: '待审', color: 'default' },
  1: { label: '已通过', color: 'green' },
  2: { label: '已驳回', color: 'red' },
};

export default function DepositAudit() {
  const { data, total, pageNo, pageSize, loading, setPageNo, setPageSize, setExtraParams, reload } =
    usePage<Deposit>('/admin/asset/deposit/page', { status: 0 });
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<number | undefined>(searchParams.get('status') ? Number(searchParams.get('status')) : 0);
  const [userId, setUserId] = useState<number | undefined>(searchParams.get('userId') ? Number(searchParams.get('userId')) : undefined);
  const [orderNo, setOrderNo] = useState(searchParams.get('orderNo') ?? '');
  const [coin, setCoin] = useState(searchParams.get('coin') ?? '');
  const [chain, setChain] = useState(searchParams.get('chain') ?? '');
  const { modal, message } = App.useApp();
  const nav = useNavigate();

  const action = (d: Deposit, pass: boolean) => {
    let remark = '';
    modal.confirm({
      title: pass ? `通过储值 ${d.orderNo}？` : `驳回储值 ${d.orderNo}？`,
      okText: pass ? '确认通过' : '确认驳回',
      okType: pass ? 'primary' : 'danger',
      content: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>用户 #{d.userId}，{d.coin} {d.amount}，链：{d.chain}</div>
          <Input.TextArea rows={3} placeholder="操作原因，必填" onChange={(e) => (remark = e.target.value)} />
        </Space>
      ),
      onOk: async () => {
        if (!remark.trim()) {
          message.warning('请填写操作原因');
          return Promise.reject();
        }
        await http.post(`/admin/asset/deposit/${d.id}/${pass ? 'approve' : 'reject'}`, { remark: remark.trim() });
        message.success('已处理');
        reload();
      },
    });
  };
  const columns = [
    { title: '订单号', dataIndex: 'orderNo', width: 200 },
    { title: '用户ID', dataIndex: 'userId', width: 100 },
    { title: '币种', dataIndex: 'coin', width: 80 },
    { title: '链', dataIndex: 'chain', width: 100 },
    { title: '金额', dataIndex: 'amount', width: 160 },
    { title: 'Tx Hash', dataIndex: 'txHash', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: number) => <Tag color={STATUS[s]?.color}>{STATUS[s]?.label}</Tag>,
    },
    { title: '提交时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '操作',
      width: 260,
      render: (_: unknown, d: Deposit) => (
        <Space wrap>
          <a onClick={() => nav(`/users?keyword=${d.userId}`)}>用户</a>
          <a onClick={() => nav(`/finance/bills?userId=${d.userId}`)}>账单</a>
          {d.txHash && <a onClick={() => navigator.clipboard?.writeText(d.txHash!).then(() => message.success('TxHash 已复制'))}>复制Tx</a>}
          {d.status === 0 ? (
            <>
              <a onClick={() => action(d, true)}>通过</a>
              <a className="admin-danger-link" onClick={() => action(d, false)}>驳回</a>
            </>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-kicker">Finance</div>
          <h1 className="admin-page-title">储值审核</h1>
          <p className="admin-page-desc">核对链上交易、用户信息与订单状态后完成储值入账审核。</p>
        </div>
      </div>
      <div className="admin-filter-panel">
      <Space wrap>
        <Select
          value={status}
          allowClear
          style={{ width: 140 }}
          placeholder="状态"
          onChange={(v) => setStatus(v)}
          options={Object.entries(STATUS).map(([k, v]) => ({ value: Number(k), label: v.label }))}
        />
        <AdminUserSelect value={userId} onChange={(v) => setUserId(v)} />
        <Input placeholder="订单号" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} style={{ width: 180 }} />
        <CoinSelect value={coin || undefined} onChange={(v) => setCoin(v ?? '')} />
        <Input placeholder="链" value={chain} onChange={(e) => setChain(e.target.value)} style={{ width: 100 }} />
        <Button type="primary" onClick={() => { setPageNo(1); setExtraParams({ status, userId, orderNo, coin, chain }); }}>
          查询
        </Button>
        <Button onClick={() => { exportCsv('储值审核', data, columns); message.success('已导出当前页数据'); }}>
          导出当前页
        </Button>
      </Space>
      </div>
      <div className="admin-table-panel">
        <div className="admin-table-header">
          <div>
            <div className="admin-table-title">储值订单</div>
            <div className="admin-table-meta">共 {total} 条记录</div>
          </div>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          pagination={{ current: pageNo, pageSize, total, showSizeChanger: true, onChange: (p, ps) => { setPageNo(p); setPageSize(ps); } }}
          columns={columns}
        />
      </div>
    </div>
  );
}
