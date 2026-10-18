import { useEffect, useState } from 'react';
import { App, Button, Form, Input, Modal, Select, Space, Switch, Table, Tag } from 'antd';
import { usePage } from '@/utils/usePage';
import http from '@/api/http';

interface AdminUser {
  id: number;
  username: string;
  nickname?: string;
  avatar?: string;
  roleId?: number;
  status: number;
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
}

interface AdminRole {
  id: number;
  name: string;
  code: string;
}

export default function AdminUserListPage() {
  const { data, total, pageNo, pageSize, loading, reload, setPageNo, setPageSize, setExtraParams } =
    usePage<AdminUser>('/admin/system/admin/page');
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [form] = Form.useForm();
  const { message, modal } = App.useApp();

  const loadRoles = () =>
    http.get<AdminRole[], AdminRole[]>('/admin/system/role/list').then((rs) => setRoles(rs ?? []));

  useEffect(() => {
    loadRoles();
  }, []);

  const save = async (v: any) => {
    await http.post('/admin/system/admin/save', {
      ...v,
      status: v.status ? 1 : 0,
    });
    message.success('已保存');
    setOpen(false);
    reload();
  };

  const setStatus = (r: AdminUser, status: number) => {
    modal.confirm({
      title: status === 1 ? `启用 ${r.username}？` : `停用 ${r.username}？`,
      onOk: async () => {
        await http.post(`/admin/system/admin/${r.id}/status`, { status });
        message.success('已更新');
        reload();
      },
    });
  };

  const resetPwd = (r: AdminUser) => {
    let password = '';
    modal.confirm({
      title: `重置 ${r.username} 密码`,
      content: <Input.Password placeholder="请输入新密码" onChange={(e) => (password = e.target.value)} />,
      onOk: async () => {
        await http.post(`/admin/system/admin/${r.id}/reset-password`, { password });
        message.success('密码已重置');
      },
    });
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-kicker">System</div>
          <h1 className="admin-page-title">管理员</h1>
          <p className="admin-page-desc">维护后台管理员账号、角色绑定、登录状态和密码重置操作。</p>
        </div>
      </div>
      <div className="admin-filter-panel">
      <Space wrap>
        <Input
          placeholder="用户名/昵称"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 200 }}
        />
        <Button type="primary" onClick={() => { setPageNo(1); setExtraParams({ keyword }); }}>
          查询
        </Button>
        <Button onClick={() => { form.resetFields(); setOpen(true); }}>
          新增管理员
        </Button>
      </Space>
      </div>

      <div className="admin-table-panel">
        <div className="admin-table-header">
          <div>
            <div className="admin-table-title">管理员账号</div>
            <div className="admin-table-meta">共 {total} 条记录</div>
          </div>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          pagination={{ current: pageNo, pageSize, total, showSizeChanger: true, onChange: (p, ps) => { setPageNo(p); setPageSize(ps); } }}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 80 },
            { title: '用户名', dataIndex: 'username', width: 140 },
            { title: '昵称', dataIndex: 'nickname', width: 140 },
            { title: '角色', dataIndex: 'roleId', width: 140, render: (id) => roles.find((x) => x.id === id)?.name ?? id ?? '-' },
            { title: '状态', dataIndex: 'status', width: 90, render: (s) => s === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag> },
            { title: '最后登录', dataIndex: 'lastLoginAt', width: 180 },
            { title: '登录 IP', dataIndex: 'lastLoginIp', width: 140 },
            { title: '创建时间', dataIndex: 'createdAt', width: 180 },
            {
              title: '操作',
              width: 230,
              render: (_, r: AdminUser) => (
                <Space className="admin-actions">
                  <a onClick={() => { form.setFieldsValue({ ...r, status: r.status === 1 }); setOpen(true); }}>编辑</a>
                  {r.status === 1 ? <a onClick={() => setStatus(r, 0)}>停用</a> : <a onClick={() => setStatus(r, 1)}>启用</a>}
                  <a onClick={() => resetPwd(r)}>重置密码</a>
                </Space>
              ),
            },
          ]}
        />
      </div>

      <Modal title="管理员" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={save} initialValues={{ status: true }} className="admin-modal-form">
          <Form.Item name="id" hidden><Input /></Form.Item>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="password" label="密码" tooltip="新增必填；编辑留空表示不修改">
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item name="nickname" label="昵称"><Input /></Form.Item>
          <Form.Item name="avatar" label="头像 URL"><Input /></Form.Item>
          <Form.Item name="roleId" label="角色">
            <Select options={roles.map((r) => ({ value: r.id, label: `${r.name} (${r.code})` }))} />
          </Form.Item>
          <Form.Item name="status" label="启用" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
