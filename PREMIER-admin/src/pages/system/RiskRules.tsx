import { Tag } from 'antd';
import AdminDataPage from '@/components/AdminDataPage';

export default function RiskRules() {
  return (
    <AdminDataPage<any>
      title="风控规则"
      url="/admin/ops/risk-rule/page"
      saveUrl="/admin/ops/risk-rule/save"
      deleteUrl={(r) => `/admin/ops/risk-rule/${r.id}/delete`}
      deletePermission="ops:risk"
      exportable
      filters={[
        { name: 'code', label: '编码' },
        { name: 'enabled', label: '状态', type: 'select', options: [{ value: 1, label: '启用' }, { value: 0, label: '停用' }] },
      ]}
      editFields={[
        { name: 'code', label: '编码', required: true },
        { name: 'name', label: '名称', required: true },
        { name: 'config', label: '配置 JSON', type: 'textarea' },
        { name: 'enabled', label: '状态', type: 'select', options: [{ value: 1, label: '启用' }, { value: 0, label: '停用' }] },
      ]}
      initialValues={{ enabled: 1 }}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '编码', dataIndex: 'code', width: 180 },
        { title: '名称', dataIndex: 'name', width: 180 },
        { title: '配置', dataIndex: 'config', ellipsis: true },
        { title: '状态', dataIndex: 'enabled', width: 90, render: (v) => v === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag> },
        { title: '创建时间', dataIndex: 'createdAt', width: 180 },
      ]}
    />
  );
}
