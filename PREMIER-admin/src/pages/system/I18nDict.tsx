import AdminDataPage from '@/components/AdminDataPage';

export default function I18nDict() {
  return (
    <AdminDataPage<any>
      title="多语言文案"
      url="/admin/ops/i18n/page"
      saveUrl="/admin/ops/i18n/save"
      deleteUrl={(r) => `/admin/ops/i18n/${r.id}/delete`}
      deletePermission="ops:i18n"
      exportable
      filters={[
        { name: 'dictKey', label: 'Key' },
        { name: 'lang', label: '语言' },
        { name: 'module', label: '模块' },
      ]}
      editFields={[
        { name: 'dictKey', label: 'Key', required: true },
        { name: 'lang', label: '语言', required: true },
        { name: 'module', label: '模块' },
        { name: 'value', label: '文案', type: 'textarea', required: true },
      ]}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: 'Key', dataIndex: 'dictKey', width: 240 },
        { title: '语言', dataIndex: 'lang', width: 100 },
        { title: '模块', dataIndex: 'module', width: 140 },
        { title: '文案', dataIndex: 'value', ellipsis: true },
      ]}
    />
  );
}
