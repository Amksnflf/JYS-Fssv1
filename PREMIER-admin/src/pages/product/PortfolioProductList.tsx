import { useEffect, useState } from 'react';
import { App, Button, Form, Input, InputNumber, Modal, Popconfirm, Space, Switch, Table, Tag } from 'antd';
import http from '@/api/http';

interface PortfolioProduct {
  id?: number;
  name: string;
  coins: string;
  minAmount: string;
  maxAmount: string;
  dailyRate: string;
  durationDays: number;
  isHot: number;
  enabled: number;
  sort: number;
}

export default function PortfolioProductListPage() {
  const [data, setData] = useState<PortfolioProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const load = async () => {
    const list = await http.get<PortfolioProduct[], PortfolioProduct[]>('/admin/content/portfolio-product/list');
    setData(list ?? []);
  };
  useEffect(() => { load(); }, []);

  const onSave = async (v: PortfolioProduct) => {
    await http.post('/admin/content/portfolio-product/save', v);
    message.success('已保存');
    setOpen(false);
    load();
  };
  const remove = async (id?: number) => {
    if (!id) return;
    await http.post(`/admin/content/portfolio-product/${id}/delete`, { reason: '后台删除' });
    message.success('已删除');
    load();
  };

  return (
    <div>
      <Button type="primary" onClick={() => { form.resetFields(); setOpen(true); }} style={{ marginBottom: 12 }}>
        新增
      </Button>
      <Table
        rowKey="id"
        dataSource={data}
        size="small"
        pagination={false}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 70 },
          { title: '名称', dataIndex: 'name' },
          { title: '币种', dataIndex: 'coins' },
          { title: '日利率', dataIndex: 'dailyRate', render: (r) => `${(Number(r) * 100).toFixed(3)}%`, width: 100 },
          { title: '期限', dataIndex: 'durationDays', width: 80, render: (d) => `${d}天` },
          { title: '总收益', render: (_, r) => `${(Number(r.dailyRate) * r.durationDays * 100).toFixed(2)}%`, width: 100 },
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
      <Modal title="编辑投资组合" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} width={600} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onSave} initialValues={{ isHot: 0, enabled: 1, sort: 0 }}>
          <Form.Item name="id" hidden><Input /></Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="coins" label="币种（逗号分隔）" rules={[{ required: true }]}><Input placeholder="SOL,DAI,XRP" /></Form.Item>
          <Space wrap>
            <Form.Item name="dailyRate" label="日利率（小数）" tooltip="如 0.003 = 0.3%/天"><Input style={{ width: 140 }} /></Form.Item>
            <Form.Item name="durationDays" label="天数"><InputNumber min={1} /></Form.Item>
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
