import { App, Modal, Tag } from 'antd';
import AdminDataPage from '@/components/AdminDataPage';
import http from '@/api/http';

const STATUS: Record<number, string> = { 1: '借出中', 2: '已还款', 3: '已清算' };

export default function LoanOrders() {
  const { message } = App.useApp();
  const setStatus = async (id: number, status: number) => {
    const reason = await promptReason();
    if (!reason) return;
    await http.post(`/admin/ops/loan-order/${id}/status`, { status, reason });
    message.success('已更新，请刷新列表');
  };

  return (
    <AdminDataPage<any>
      url="/admin/ops/loan-order/page"
      exportable
      actions={[
        {
          label: '还款',
          hidden: (r) => r.status !== 1,
          confirm: (r) => `确认标记订单 ${r.orderNo} 已还款？`,
          onClick: async (r, { reload }) => {
            await setStatus(r.id, 2);
            reload();
          },
        },
        {
          label: '清算',
          danger: true,
          hidden: (r) => r.status !== 1,
          confirm: (r) => `确认清算订单 ${r.orderNo}？`,
          onClick: async (r, { reload }) => {
            await setStatus(r.id, 3);
            reload();
          },
        },
      ]}
      filters={[
        { name: 'userId', label: '用户ID', type: 'number' },
        { name: 'coin', label: '币种' },
        { name: 'status', label: '状态', type: 'select', options: Object.entries(STATUS).map(([value, label]) => ({ value: Number(value), label })) },
      ]}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '订单号', dataIndex: 'orderNo', width: 200 },
        { title: '用户ID', dataIndex: 'userId', width: 100 },
        { title: '币种', dataIndex: 'coin', width: 100 },
        { title: '借款', dataIndex: 'borrowAmount', width: 140 },
        { title: '抵押', dataIndex: 'collateralAmount', width: 140 },
        { title: '利息', dataIndex: 'totalInterest', width: 120 },
        { title: '状态', dataIndex: 'status', width: 100, render: (v) => <Tag>{STATUS[v] ?? v}</Tag> },
        { title: '到期时间', dataIndex: 'dueAt', width: 180 },
      ]}
    />
  );
}

function promptReason(): Promise<string | null> {
  return new Promise((resolve) => {
    let value = '';
    Modal.confirm({
      title: '填写操作原因',
      content: <textarea style={{ width: '100%', minHeight: 80 }} onChange={(e) => { value = e.target.value; }} />,
      onOk: () => resolve(value.trim() || null),
      onCancel: () => resolve(null),
    });
  });
}
