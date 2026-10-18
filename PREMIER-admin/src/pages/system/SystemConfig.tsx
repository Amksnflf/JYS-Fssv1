import AdminDataPage from '@/components/AdminDataPage';

export default function SystemConfig() {
  return (
    <AdminDataPage<any>
      title="系统参数"
      url="/admin/ops/config/page"
      saveUrl="/admin/ops/config/save"
      deleteUrl={(r) => `/admin/ops/config/${r.id}/delete`}
      deletePermission="ops:config"
      exportable
      filters={[
        { name: 'configKey', label: '参数 Key' },
        { name: 'module', label: '模块' },
      ]}
      editFields={[
        { name: 'configKey', label: '参数 Key', required: true },
        { name: 'module', label: '模块' },
        { name: 'configValue', label: '参数值', type: 'textarea', required: true },
        { name: 'remark', label: '变更备注', required: true },
      ]}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '参数 Key', dataIndex: 'configKey', width: 220 },
        { title: '模块', dataIndex: 'module', width: 140 },
        { title: '参数值', dataIndex: 'configValue', ellipsis: true },
        { title: '备注', dataIndex: 'remark', width: 220 },
        { title: '更新时间', dataIndex: 'updatedAt', width: 180 },
      ]}
    />
  );
}
