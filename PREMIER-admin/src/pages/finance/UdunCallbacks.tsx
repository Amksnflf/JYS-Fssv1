import { Tag } from 'antd';
import AdminDataPage from '@/components/AdminDataPage';

export default function UdunCallbacks() {
  return (
    <AdminDataPage<any>
      title="优盾回调日志"
      url="/admin/asset/udun-callback/page"
      exportable
      filters={[
        { name: 'txHash', label: 'Tx Hash' },
        { name: 'tradeId', label: '优盾流水' },
        { name: 'processed', label: '处理状态', type: 'select', options: [{ value: 1, label: '已处理' }, { value: 0, label: '未处理/失败' }] },
      ]}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '流水号', dataIndex: 'tradeId', width: 170, ellipsis: true },
        { title: '类型', dataIndex: 'tradeType', width: 80 },
        { title: '状态', dataIndex: 'status', width: 80 },
        { title: 'Tx Hash', dataIndex: 'txHash', ellipsis: true },
        { title: '地址', dataIndex: 'address', ellipsis: true },
        { title: '币种编号', dataIndex: 'coinType', width: 100 },
        { title: '验签', dataIndex: 'signValid', width: 90, render: (v) => v === 1 ? <Tag color="green">通过</Tag> : <Tag color="red">失败</Tag> },
        { title: '处理', dataIndex: 'processed', width: 90, render: (v) => v === 1 ? <Tag color="green">成功</Tag> : <Tag>未处理</Tag> },
        { title: '失败原因', dataIndex: 'failReason', width: 220, ellipsis: true },
        { title: '时间', dataIndex: 'createdAt', width: 180 },
      ]}
    />
  );
}
