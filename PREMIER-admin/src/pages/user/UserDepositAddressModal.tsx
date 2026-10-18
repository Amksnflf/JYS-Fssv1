import { useCallback, useEffect, useState } from 'react';
import { App, Button, Form, Input, Modal, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import CoinSelect from '@/components/CoinSelect';
import http from '@/api/http';

export interface DepositAddressUser {
  id: number;
  uid: string;
}

interface UserDepositAddress {
  id: number;
  userId: number;
  coin: string;
  chain: string;
  address: string;
  memo?: string;
  enabled: number;
  createdAt?: string;
}

interface PageResp<T> {
  records: T[];
  total: number;
}

interface Props {
  open: boolean;
  user: DepositAddressUser | null;
  onClose: () => void;
}

const PAGE_URL = '/admin/asset/user-deposit-address/page';
const SAVE_URL = '/admin/asset/user-deposit-address/save';
const deleteUrl = (id: number) => `/admin/asset/user-deposit-address/${id}/delete`;

export default function UserDepositAddressModal({ open, user, onClose }: Props) {
  const { message, modal } = App.useApp();
  const [list, setList] = useState<UserDepositAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm] = Form.useForm<Partial<UserDepositAddress>>();

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const resp = await http.get<PageResp<UserDepositAddress>, PageResp<UserDepositAddress>>(PAGE_URL, {
        params: { pageNo: 1, pageSize: 100, userId: user.id },
      });
      setList(resp?.records ?? []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open && user) {
      reload();
    } else if (!open) {
      setList([]);
    }
  }, [open, user, reload]);

  const openEdit = (record?: UserDepositAddress) => {
    editForm.resetFields();
    editForm.setFieldsValue(record ? { ...record } : { enabled: 1 });
    setEditOpen(true);
  };

  const submitEdit = async (values: Partial<UserDepositAddress>) => {
    if (!user) return;
    setSaving(true);
    try {
      await http.post(SAVE_URL, { ...values, userId: user.id });
      message.success('已保存');
      setEditOpen(false);
      reload();
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (record: UserDepositAddress, enabled: number) => {
    await http.post(SAVE_URL, { ...record, userId: user?.id, enabled });
    message.success(enabled === 1 ? '已启用' : '已停用');
    reload();
  };

  const remove = (record: UserDepositAddress) => {
    modal.confirm({
      title: '确认删除该充值地址？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await http.post(deleteUrl(record.id), { reason: '后台删除' });
        message.success('已删除');
        reload();
      },
    });
  };

  const columns: ColumnsType<UserDepositAddress> = [
    { title: '币种', dataIndex: 'coin', width: 90 },
    { title: '链', dataIndex: 'chain', width: 110 },
    { title: '地址', dataIndex: 'address', ellipsis: true },
    { title: 'Memo', dataIndex: 'memo', width: 140 },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 80,
      render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 170 },
    {
      title: '操作',
      width: 200,
      render: (_, record) => (
        <Space className="admin-actions" wrap>
          <a onClick={() => openEdit(record)}>编辑</a>
          <a
            onClick={async () => {
              await navigator.clipboard?.writeText(record.address);
              message.success('地址已复制');
            }}
          >
            复制
          </a>
          {record.enabled === 1 ? (
            <a onClick={() => toggleEnabled(record, 0)}>停用</a>
          ) : (
            <a onClick={() => toggleEnabled(record, 1)}>启用</a>
          )}
          <a className="admin-danger-link" onClick={() => remove(record)}>
            删除
          </a>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        open={open}
        title={`充值地址 - ${user?.uid ?? ''}`}
        onCancel={onClose}
        footer={null}
        width={900}
        destroyOnClose
      >
        <div style={{ marginBottom: 12 }}>
          <Space direction="vertical" size={4} style={{ display: 'flex' }}>
            <span style={{ color: '#999', fontSize: 12 }}>
              为该用户单独配置充值地址后，客户端将只展示这里配置的地址，不再使用平台公共充值地址；未配置时仍使用公共地址。
            </span>
            <Button type="primary" onClick={() => openEdit()}>
              新增充值地址
            </Button>
          </Space>
        </div>
        <Table
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={list}
          columns={columns}
          pagination={false}
          scroll={{ x: 720 }}
        />
      </Modal>

      <Modal
        title="编辑充值地址"
        open={editOpen}
        confirmLoading={saving}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={submitEdit} className="admin-modal-form">
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="coin" label="币种" rules={[{ required: true, message: '请选择币种' }]}>
            <CoinSelect walletEnabled={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="chain" label="链" rules={[{ required: true, message: '请输入链' }]}>
            <Input placeholder="如 TRC20 / ERC20" />
          </Form.Item>
          <Form.Item name="address" label="地址" rules={[{ required: true, message: '请输入地址' }]}>
            <Input placeholder="请输入充值地址" />
          </Form.Item>
          <Form.Item name="memo" label="Memo">
            <Input placeholder="选填，部分链需要" />
          </Form.Item>
          <Form.Item name="enabled" label="状态" initialValue={1} rules={[{ required: true }]}>
            <CoinAddressStatusSelect />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function CoinAddressStatusSelect(props: { value?: number; onChange?: (value: number) => void }) {
  const { value, onChange } = props;
  return (
    <Space>
      <Button type={value === 1 ? 'primary' : 'default'} onClick={() => onChange?.(1)}>
        启用
      </Button>
      <Button type={value === 0 ? 'primary' : 'default'} onClick={() => onChange?.(0)}>
        停用
      </Button>
    </Space>
  );
}
