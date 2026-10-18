import AdminDataPage from '@/components/AdminDataPage';

const ACC: Record<number, string> = { 1: '现货', 2: '交易', 3: '理财' };

export default function Transfers() {
  return (
    <AdminDataPage<any>
      url="/admin/asset/transfer/page"
      exportable
      filters={[
        { name: 'userId', label: '用户ID', type: 'number' },
        { name: 'coin', label: '币种' },
      ]}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '订单号', dataIndex: 'orderNo', width: 200 },
        { title: '用户ID', dataIndex: 'userId', width: 100 },
        { title: '转出账户', dataIndex: 'fromAccount', width: 100, render: (v) => ACC[v] ?? v },
        { title: '转入账户', dataIndex: 'toAccount', width: 100, render: (v) => ACC[v] ?? v },
        { title: '币种', dataIndex: 'coin', width: 100 },
        { title: '数量', dataIndex: 'amount', width: 160 },
        { title: '时间', dataIndex: 'createdAt', width: 180 },
      ]}
    />
  );
}
