import AdminDataPage from '@/components/AdminDataPage';
import { App, Tag } from 'antd';
import http from '@/api/http';

export default function DynamicList() {
  const { message } = App.useApp();
  return (
    <AdminDataPage<any>
      url="/admin/ops/dynamic/page"
      saveUrl="/admin/ops/dynamic/save"
      deleteUrl={(r) => `/admin/ops/dynamic/${r.id}/delete`}
      deletePermission="ops:dynamic"
      exportable
      initialValues={{ status: 1, pinned: 0, likeCount: 0, commentCount: 0 }}
      actions={[
        {
          label: '隐藏',
          hidden: (r) => r.status === 0,
          confirm: '确认隐藏这条动态？',
          onClick: async (r, { reload }) => {
            await http.post(`/admin/ops/dynamic/${r.id}/status`, { status: 0, reason: '后台隐藏动态' });
            message.success('已隐藏');
            reload();
          },
        },
        {
          label: '恢复',
          hidden: (r) => r.status !== 0,
          confirm: '确认恢复展示这条动态？',
          onClick: async (r, { reload }) => {
            await http.post(`/admin/ops/dynamic/${r.id}/status`, { status: 1, reason: '后台恢复动态' });
            message.success('已恢复');
            reload();
          },
        },
        {
          label: '置顶',
          hidden: (r) => r.pinned === 1,
          onClick: async (r, { reload }) => {
            await http.post(`/admin/ops/dynamic/${r.id}/status`, { pinned: 1, reason: '后台置顶动态' });
            message.success('已置顶');
            reload();
          },
        },
        {
          label: '取消置顶',
          hidden: (r) => r.pinned !== 1,
          onClick: async (r, { reload }) => {
            await http.post(`/admin/ops/dynamic/${r.id}/status`, { pinned: 0, reason: '后台取消置顶动态' });
            message.success('已取消置顶');
            reload();
          },
        },
      ]}
      filters={[
        { name: 'userId', label: '用户ID', type: 'number' },
        { name: 'status', label: '状态', type: 'select', options: [{ value: 1, label: '展示' }, { value: 0, label: '隐藏' }] },
      ]}
      editFields={[
        { name: 'userId', label: '用户ID', type: 'number', required: true },
        { name: 'content', label: '内容', type: 'textarea', required: true },
        { name: 'images', label: '图片' },
        { name: 'status', label: '状态', type: 'select', options: [{ value: 1, label: '展示' }, { value: 0, label: '隐藏' }] },
        { name: 'pinned', label: '置顶', type: 'select', options: [{ value: 1, label: '置顶' }, { value: 0, label: '普通' }] },
      ]}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '用户ID', dataIndex: 'userId', width: 100 },
        { title: '内容', dataIndex: 'content', ellipsis: true },
        { title: '图片', dataIndex: 'images', ellipsis: true },
        { title: '点赞', dataIndex: 'likeCount', width: 90 },
        { title: '评论', dataIndex: 'commentCount', width: 90 },
        { title: '状态', dataIndex: 'status', width: 90, render: (v) => v === 0 ? <Tag>隐藏</Tag> : <Tag color="green">展示</Tag> },
        { title: '置顶', dataIndex: 'pinned', width: 90, render: (v) => v === 1 ? <Tag color="gold">置顶</Tag> : '-' },
        { title: '时间', dataIndex: 'createdAt', width: 180 },
      ]}
    />
  );
}
