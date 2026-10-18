import { useEffect, useState } from 'react';
import { App, Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag } from 'antd';
import http from '@/api/http';

interface LockProduct {
  id?: number;
  name: string;
  coin: string;
  lockType: number;
  lockDays: number;
  aprMin: string;
  aprMax: string;
  minAmount: string;
  maxAmount: string;
  isHot: number;
  enabled: number;
  sort: number;
}

export default function LockProductListPage() {
  const [data, setData] = useState<LockProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const load = async () => {
    const list = await http.get<LockProduct[], LockProduct[]>('/admin/content/lock-product/list');
    setData(list ?? []);
  };
  useEffect(() => { load(); }, []);

  const onSave = async (v: LockProduct) => {
    await http.post('/admin/content/lock-product/save', v);
    message.success('已保存');
    setOpen(false);
    load();
  };
  const remove = async (id?: number) => {
    if (!id) return;
    await http.post(`/admin/content/lock-product/${id}/delete`, { reason: '后台删除' });
    message.success('已删除');
    load();
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={() => { form.resetFields(); setOpen(true); }}>新增</Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={data}
        size="small"
        pagination={false}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 70 },
          { title: '名称', dataIndex: 'name' },
          { title: '币种', dataIndex: 'coin', width: 80 },
          { title: '类型', dataIndex: 'lockType', width: 80, render: (t) => t === 1 ? '活期' : '定期' },
          { title: '天数', dataIndex: 'lockDays', width: 70 },
          { title: 'APR', render: (_, r) => `${(Number(r.aprMin) * 100).toFixed(2)}%-${(Number(r.aprMax) * 100).toFixed(2)}%`, width: 140 },
          { title: '起购', dataIndex: 'minAmount', width: 110 },
          { title: '上限', dataIndex: 'maxAmount', width: 110 },
          { title: '热门', dataIndex: 'isHot', width: 60, render: (v) => v ? <Tag color="red">热</Tag> : '-' },
          { title: '启用', dataIndex: 'enabled', width: 60, render: (v) => v ? <Tag color="green">开</Tag> : <Tag>关</Tag> },
          { title: '排序', dataIndex: 'sort', width: 70 },
          {
            title: '操作', width: 120,
            render: (_, r) => (
              <Space>
                <a onClick={() => { form.setFieldsValue(r); setOpen(true); }}>编辑</a>
                <Popconfirm title="确认删除？" onConfirm={() => remove(r.id)}><a style={{ color: '#ef4444' }}>删除</a></Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal title="编辑锁仓产品" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} width={600} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onSave} initialValues={{ lockType: 1, isHot: 0, enabled: 1, sort: 0 }}>
          <Form.Item name="id" hidden><Input /></Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Space wrap>
            <Form.Item name="coin" label="币种" rules={[{ required: true }]}><Input style={{ width: 120 }} /></Form.Item>
            <Form.Item name="lockType" label="类型">
              <Select style={{ width: 120 }} options={[{ value: 1, label: '活期' }, { value: 2, label: '定期' }]} />
            </Form.Item>
            <Form.Item name="lockDays" label="锁仓天数（活期填 0）"><InputNumber min={0} /></Form.Item>
          </Space>
          <Space wrap>
            <Form.Item name="aprMin" label="APR 最小（小数）" tooltip="如 0.05 = 5%"><Input style={{ width: 140 }} /></Form.Item>
            <Form.Item name="aprMax" label="APR 最大"><Input style={{ width: 140 }} /></Form.Item>
            <Form.Item name="minAmount" label="起购"><Input style={{ width: 140 }} /></Form.Item>
            <Form.Item name="maxAmount" label="上限"><Input style={{ width: 140 }} /></Form.Item>
          </Space>
          <Space>
            <Form.Item name="isHot" label="热门" valuePropName="checked" getValueFromEvent={(c) => c ? 1 : 0} getValueProps={(v) => ({ checked: v === 1 })}><Switch /></Form.Item>
            <Form.Item name="enabled" label="启用" valuePropName="checked" getValueFromEvent={(c) => c ? 1 : 0} getValueProps={(v) => ({ checked: v === 1 })}><Switch /></Form.Item>
            <Form.Item name="sort" label="排序"><InputNumber /></Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
