import { App, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import AdminDataPage from '@/components/AdminDataPage';
import http from '@/api/http';

export default function UserAddresses() {
  const { message } = App.useApp();
  const nav = useNavigate();
  return (
    <AdminDataPage<any>
      url="/admin/asset/user-address/page"
      exportable
      deleteUrl={(r) => `/admin/asset/user-address/${r.id}/delete`}
      deletePermission="asset:address"
      actions={[
        {
          label: '复制地址',
          onClick: async (r) => {
            await navigator.clipboard?.writeText(r.address);
            message.success('地址已复制');
          },
        },
        {
          label: '用户',
          onClick: (r) => nav(`/users?keyword=${r.userId}`),
        },
        {
          label: '提现',
          onClick: (r) => nav(`/finance/withdraw?userId=${r.userId}&address=${r.address}`),
        },
        {
          label: '加入白名单',
          permission: 'asset:address',
          hidden: (r) => r.whitelist === 1,
          confirm: '确认加入白名单？',
          onClick: async (r, { reload }) => {
            await http.post(`/admin/asset/user-address/${r.id}/whitelist`, { status: 1, reason: '后台加入白名单' });
            message.success('已加入白名单');
            reload();
          },
        },
        {
          label: '取消白名单',
          permission: 'asset:address',
          danger: true,
          hidden: (r) => r.whitelist !== 1,
          confirm: '确认取消白名单？',
          onClick: async (r, { reload }) => {
            await http.post(`/admin/asset/user-address/${r.id}/whitelist`, { status: 0, reason: '后台取消白名单' });
            message.success('已取消白名单');
            reload();
          },
        },
      ]}
      filters={[
        { name: 'userId', label: '用户ID', type: 'number' },
        { name: 'coin', label: '币种' },
        { name: 'chain', label: '链' },
        { name: 'whitelist', label: '白名单', type: 'select', options: [{ value: 1, label: '是' }, { value: 0, label: '否' }] },
      ]}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '用户ID', dataIndex: 'userId', width: 100 },
        { title: '币种', dataIndex: 'coin', width: 100 },
        { title: '链', dataIndex: 'chain', width: 120 },
        { title: '地址', dataIndex: 'address', ellipsis: true },
        { title: 'Memo', dataIndex: 'memo', width: 140 },
        { title: '备注', dataIndex: 'remark', width: 160 },
        { title: '白名单', dataIndex: 'whitelist', width: 90, render: (v) => v === 1 ? <Tag color="green">是</Tag> : <Tag>否</Tag> },
        { title: '创建时间', dataIndex: 'createdAt', width: 180 },
      ]}
    />
  );
}
