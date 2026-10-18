import { Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import AdminDataPage from '@/components/AdminDataPage';

export default function SpotTrades() {
  const nav = useNavigate();
  return (
    <AdminDataPage<any>
      url="/admin/trade/spot/trade/page"
      exportable
      actions={[
        {
          label: '订单',
          onClick: (r) => nav(`/trade/spot?orderId=${r.orderId}`),
        },
        {
          label: '用户',
          onClick: (r) => nav(`/users?keyword=${r.userId}`),
        },
      ]}
      filters={[
        { name: 'userId', label: '用户ID', type: 'number' },
        { name: 'orderId', label: '订单ID', type: 'number' },
        { name: 'symbol', label: '交易对' },
      ]}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '成交号', dataIndex: 'tradeNo', width: 200 },
        { title: '订单ID', dataIndex: 'orderId', width: 100 },
        { title: '用户ID', dataIndex: 'userId', width: 100 },
        { title: '交易对', dataIndex: 'symbol', width: 120 },
        { title: '方向', dataIndex: 'side', width: 80, render: (v) => v === 1 ? <Tag color="green">买</Tag> : <Tag color="red">卖</Tag> },
        { title: '价格', dataIndex: 'price', width: 140 },
        { title: '数量', dataIndex: 'amount', width: 140 },
        { title: '成交额', dataIndex: 'total', width: 140 },
        { title: '手续费', dataIndex: 'fee', width: 120 },
        { title: '时间', dataIndex: 'createdAt', width: 180 },
      ]}
    />
  );
}
