import { App, Tag } from 'antd';
import AdminDataPage from '@/components/AdminDataPage';
import http from '@/api/http';

export default function DepositAddresses() {
  const { message } = App.useApp();
  return (
    <AdminDataPage<any>
      title="平台充值地址"
      url="/admin/asset/deposit-address/page"
      saveUrl="/admin/asset/deposit-address/save"
      deleteUrl={(r) => `/admin/asset/deposit-address/${r.id}/delete`}
      deletePermission="asset:deposit-address"
      exportable
      actions={[
        {
          label: '复制地址',
          onClick: async (r) => {
            await navigator.clipboard?.writeText(r.address);
            message.success('地址已复制');
          },
        },
        {
          label: '停用',
          hidden: (r) => r.enabled === 0,
          confirm: '确认停用这个充值地址？',
          onClick: async (r, { reload }) => {
            await http.post('/admin/asset/deposit-address/save', { ...r, enabled: 0 });
            message.success('已停用');
            reload();
          },
        },
        {
          label: '启用',
          hidden: (r) => r.enabled !== 0,
          onClick: async (r, { reload }) => {
            await http.post('/admin/asset/deposit-address/save', { ...r, enabled: 1 });
            message.success('已启用');
            reload();
          },
        },
      ]}
      filters={[
        { name: 'coin', label: '币种' },
        { name: 'chain', label: '链' },
        { name: 'enabled', label: '状态', type: 'select', options: [{ value: 1, label: '启用' }, { value: 0, label: '停用' }] },
      ]}
      editFields={[
        { name: 'coin', label: '币种', required: true },
        { name: 'chain', label: '链', required: true },
        { name: 'address', label: '地址', required: true },
        { name: 'memo', label: 'Memo' },
        { name: 'enabled', label: '状态', type: 'select', options: [{ value: 1, label: '启用' }, { value: 0, label: '停用' }] },
      ]}
      initialValues={{ enabled: 1 }}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '币种', dataIndex: 'coin', width: 100 },
        { title: '链', dataIndex: 'chain', width: 120 },
        { title: '地址', dataIndex: 'address', ellipsis: true },
        { title: 'Memo', dataIndex: 'memo', width: 160 },
        { title: '状态', dataIndex: 'enabled', width: 90, render: (v) => v === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag> },
        { title: '创建时间', dataIndex: 'createdAt', width: 180 },
      ]}
    />
  );
}
