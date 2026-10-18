import { App, Modal, Tag } from 'antd';
import { Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import AdminDataPage from '@/components/AdminDataPage';
import http from '@/api/http';

const SIDE: Record<number, string> = { 1: '开多', 2: '开空', 3: '平多', 4: '平空' };
const STATUS: Record<number, string> = { 0: '待成交', 1: '部分成交', 2: '已成交', 3: '已撤销' };

export default function PerpOrders() {
  const { message } = App.useApp();
  const nav = useNavigate();
  return (
    <AdminDataPage<any>
      url="/admin/trade/perp/order/page"
      exportable
      actions={[
        {
          label: '用户',
          onClick: (r) => nav(`/users?keyword=${r.userId}`),
        },
        {
          label: '持仓',
          onClick: (r) => nav(`/trade/perp?userId=${r.userId}`),
        },
        {
          label: '撤单',
          permission: 'trade:cancel',
          hidden: (r) => r.status >= 2,
          onClick: async (r, { reload }) => {
            const reason = await promptReason(`撤销永续委托 ${r.orderNo}`, message.warning);
            if (!reason) return;
            await http.post(`/admin/trade/perp/order/${r.id}/cancel`, { reason });
            message.success('已撤单');
            reload();
          },
        },
      ]}
      filters={[
        { name: 'userId', label: '用户', type: 'userSelect' },
        { name: 'orderId', label: '订单ID', type: 'number' },
        { name: 'symbol', label: '交易对', type: 'symbolSelect', tradeType: 'perp' },
      ]}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '订单号', dataIndex: 'orderNo', width: 200 },
        { title: '用户ID', dataIndex: 'userId', width: 100 },
        { title: '交易对', dataIndex: 'symbol', width: 120 },
        { title: '方向', dataIndex: 'side', width: 90, render: (v) => <Tag>{SIDE[v] ?? v}</Tag> },
        { title: '杠杆', dataIndex: 'leverage', width: 80 },
        { title: '价格', dataIndex: 'price', width: 140 },
        { title: '数量', dataIndex: 'amount', width: 140 },
        { title: '成交量', dataIndex: 'dealAmount', width: 140 },
        { title: '状态', dataIndex: 'status', width: 100, render: (v) => STATUS[v] ?? v },
        { title: '时间', dataIndex: 'createdAt', width: 180 },
      ]}
    />
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
