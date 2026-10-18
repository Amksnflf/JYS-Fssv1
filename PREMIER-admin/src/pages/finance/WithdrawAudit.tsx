import { useState } from 'react';
import { App, Button, Input, Modal, Select, Space, Table, Tag } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { usePage } from '@/utils/usePage';
import http from '@/api/http';
import { exportCsv } from '@/utils/exportCsv';
import AdminUserSelect from '@/components/AdminUserSelect';
import CoinSelect from '@/components/CoinSelect';

interface Withdraw {
  id: number;
  orderNo: string;
  userId: number;
  coin: string;
  chain: string;
  toAddress: string;
  amount: string;
  fee: string;
  txHash?: string;
  status: number;
  createdAt: string;
}

const STATUS: Record<number, { label: string; color: string }> = {
  0: { label: '待审', color: 'default' },
  1: { label: '处理中', color: 'blue' },
  2: { label: '成功', color: 'green' },
  3: { label: '已驳回', color: 'red' },
};

export default function WithdrawAudit() {
  const { data, total, pageNo, pageSize, loading, setPageNo, setPageSize, setExtraParams, reload } =
    usePage<Withdraw>('/admin/asset/withdraw/page', { status: 0 });
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<number | undefined>(searchParams.get('status') ? Number(searchParams.get('status')) : 0);
  const [userId, setUserId] = useState<number | undefined>(searchParams.get('userId') ? Number(searchParams.get('userId')) : undefined);
  const [orderNo, setOrderNo] = useState(searchParams.get('orderNo') ?? '');
  const [coin, setCoin] = useState(searchParams.get('coin') ?? '');
  const [chain, setChain] = useState(searchParams.get('chain') ?? '');
  const [address, setAddress] = useState(searchParams.get('address') ?? '');
  const { modal, message } = App.useApp();

  const markProcessing = (d: Withdraw) => {
    let remark = '';
    modal.confirm({
      title: `提现进入处理中 ${d.orderNo}`,
      okText: '确认标记',
      content: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>用户 #{d.userId}，{d.coin} {d.amount}，到账地址：{d.toAddress}</div>
          <Input.TextArea rows={3} placeholder="操作原因，必填" onChange={(e) => (remark = e.target.value)} />
        </Space>
      ),
      onOk: async () => {
        if (!remark.trim()) {
          message.warning('请填写操作原因');
          return Promise.reject();
        }
        await http.post(`/admin/asset/withdraw/${d.id}/mark-processing`, { remark: remark.trim() });
        message.success('已标记处理中');
        reload();
      },
    });
  };

  const markPaid = (d: Withdraw) => {
    let txHash = '';
    let remark = '';
    modal.confirm({
      title: `标记成功 ${d.orderNo}`,
      okText: '确认成功',
      content: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>用户 #{d.userId}，{d.coin} {d.amount}，手续费 {d.fee}</div>
          <Input placeholder="区块链 Tx Hash，必填" onChange={(e) => (txHash = e.target.value)} />
          <Input.TextArea rows={3} placeholder="操作原因，必填" onChange={(e) => (remark = e.target.value)} />
        </Space>
      ),
      onOk: async () => {
        if (!txHash.trim() || !remark.trim()) {
          message.warning('请填写 Tx Hash 和操作原因');
          return Promise.reject();
        }
        await http.post(`/admin/asset/withdraw/${d.id}/mark-paid`, { txHash: txHash.trim(), remark: remark.trim() });
        message.success('已处理');
        reload();
      },
    });
  };
  const reject = (d: Withdraw) => {
    let remark = '';
    modal.confirm({
      title: `驳回提现 ${d.orderNo}`,
      okText: '确认驳回',
      okType: 'danger',
      content: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>驳回后资金将退回用户 #{d.userId}，请确认链上未放款。</div>
          <Input.TextArea rows={3} placeholder="拒绝原因，必填" onChange={(e) => (remark = e.target.value)} />
        </Space>
      ),
      onOk: async () => {
        if (!remark.trim()) {
          message.warning('请填写拒绝原因');
          return Promise.reject();
        }
        await http.post(`/admin/asset/withdraw/${d.id}/reject`, { remark: remark.trim() });
        message.success('已驳回，资金已退回');
        reload();
      },
    });
  };
  const columns = [
    { title: '订单号', dataIndex: 'orderNo', width: 200 },
    { title: '用户ID', dataIndex: 'userId', width: 100 },
    { title: '币种', dataIndex: 'coin', width: 80 },
    { title: '链', dataIndex: 'chain', width: 100 },
    { title: '到账地址', dataIndex: 'toAddress', ellipsis: true },
    { title: '金额', dataIndex: 'amount', width: 140 },
    { title: '手续费', dataIndex: 'fee', width: 120 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: number) => <Tag color={STATUS[s]?.color}>{STATUS[s]?.label}</Tag>,
    },
    { title: '提交时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '操作',
      width: 300,
      render: (_: unknown, d: Withdraw) =>
        d.status === 0 || d.status === 1 ? (
          <Space className="admin-actions">
            {d.status === 0 && <a onClick={() => markProcessing(d)}>标记处理中</a>}
            <a onClick={() => markPaid(d)}>{d.status === 0 ? '直接成功' : '标记成功'}</a>
            <a onClick={() => navigator.clipboard?.writeText(d.toAddress).then(() => message.success('地址已复制'))}>复制地址</a>
            <a className="admin-danger-link" onClick={() => reject(d)}>驳回</a>
          </Space>
        ) : null,
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-kicker">Finance</div>
          <h1 className="admin-page-title">提现审核</h1>
          <p className="admin-page-desc">核对提现地址、手续费与处理状态，支持标记处理中、成功和驳回。</p>
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
        <Input placeholder="地址" value={address} onChange={(e) => setAddress(e.target.value)} style={{ width: 180 }} />
        <Button type="primary" onClick={() => { setPageNo(1); setExtraParams({ status, userId, orderNo, coin, chain, address }); }}>
          查询
        </Button>
        <Button onClick={() => { exportCsv('提现审核', data, columns); message.success('已导出当前页数据'); }}>
          导出当前页
        </Button>
      </Space>
      </div>
      <div className="admin-table-panel">
        <div className="admin-table-header">
          <div>
            <div className="admin-table-title">提现订单</div>
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
