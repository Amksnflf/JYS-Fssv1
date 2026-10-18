import { useEffect, useState } from 'react';
import { App, Button, Form, Input, Modal, Popconfirm, Space, Table } from 'antd';
import http from '@/api/http';

interface AdminRole {
  id?: number;
  name: string;
  code: string;
  permissions: string;
  createdAt?: string;
}

const DEFAULT_PERMISSIONS = [
  '*',
  'dashboard:view',
  'user:view',
  'user:kyc',
  'user:security',
  'asset:view',
  'asset:audit',
  'asset:adjust',
  'asset:address',
  'asset:deposit-address',
  'trade:view',
  'trade:intervene',
  'trade:cancel',
  'control:offset',
  'control:winrate',
  'content:*',
  'content:feedback',
  'support:view',
  'support:reply',
  'support:assign',
  'support:config',
  'report:view',
  'finance-control:*',
  'ops:*',
  'system:*',
  'system:log',
].join('\n');

export default function RoleListPage() {
  const [data, setData] = useState<AdminRole[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const load = async () => {
    const rs = await http.get<AdminRole[], AdminRole[]>('/admin/system/role/list');
    setData(rs ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (v: any) => {
    const lines = String(v.permissionsText ?? '')
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
    await http.post('/admin/system/role/save', {
      id: v.id,
      name: v.name,
      code: v.code,
      permissions: JSON.stringify(lines),
    });
    message.success('已保存');
    setOpen(false);
    load();
  };

  const edit = (r?: AdminRole) => {
    if (r) {
      let text = '';
      try {
        text = JSON.parse(r.permissions || '[]').join('\n');
      } catch {
        text = r.permissions || '';
      }
      form.setFieldsValue({ ...r, permissionsText: text });
    } else {
      form.resetFields();
      form.setFieldsValue({ permissionsText: DEFAULT_PERMISSIONS });
    }
    setOpen(true);
  };
  const copyRole = (r: AdminRole) => {
    let text = '';
    try {
      text = JSON.parse(r.permissions || '[]').join('\n');
    } catch {
      text = r.permissions || '';
    }
    form.setFieldsValue({ name: `${r.name} 副本`, code: `${r.code}_copy`, permissionsText: text });
    setOpen(true);
  };
  const remove = async (id?: number) => {
    if (!id) return;
    await http.post(`/admin/system/role/${id}/delete`);
    message.success('已删除');
    load();
  };

  return (
    <div>
      <Button type="primary" onClick={() => edit()} style={{ marginBottom: 12 }}>
        新增角色
      </Button>
      <Table
        rowKey="id"
        dataSource={data}
        pagination={false}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 80 },
          { title: '名称', dataIndex: 'name', width: 160 },
          { title: '编码', dataIndex: 'code', width: 180 },
          { title: '权限 JSON', dataIndex: 'permissions', ellipsis: true },
          { title: '创建时间', dataIndex: 'createdAt', width: 180 },
          {
            title: '操作',
            width: 160,
            render: (_, r) => (
              <Space>
                <a onClick={() => edit(r)}>编辑</a>
                <a onClick={() => copyRole(r)}>复制</a>
                <Popconfirm title="确认删除角色？" onConfirm={() => remove(r.id)}>
                  <a style={{ color: '#ef4444' }}>删除</a>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal title="角色" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} width={680} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="id" hidden><Input /></Form.Item>
          <Space>
            <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input style={{ width: 220 }} /></Form.Item>
            <Form.Item name="code" label="编码" rules={[{ required: true }]}><Input style={{ width: 220 }} /></Form.Item>
          </Space>
          <Form.Item name="permissionsText" label="权限（每行一个）">
            <Input.TextArea rows={10} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
